const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Company = require('../models/Company');
const router = express.Router();

// กำหนดการเก็บไฟล์สำหรับ multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads');
        // สร้างโฟลเดอร์ถ้าไม่มี
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // สร้างชื่อไฟล์ใหม่เพื่อป้องกันการซ้ำ
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// กำหนดประเภทไฟล์ที่อนุญาต
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (JPEG, JPG, PNG, GIF, WebP)'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // จำกัดขนาดไฟล์ 5MB
    },
    fileFilter: fileFilter
});

// GET - ดึงข้อมูลบริษัท
router.get('/', async (req, res) => {
    try {
        const company = await Company.findOne().sort({ createdAt: -1 }); // ดึงข้อมูลล่าสุด
        res.json(company || {});
    } catch (error) {
        console.error('Error fetching company:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลบริษัท' });
    }
});

// POST - สร้างหรืออัปเดตข้อมูลบริษัท
router.post('/', upload.single('logo'), async (req, res) => {
    try {
        const { name, address, phone, email, taxId, website, description } = req.body;
        
        // ตรวจสอบข้อมูลที่จำเป็น
        if (!name || !address || !phone) {
            return res.status(400).json({ 
                message: 'กรุณากรอกข้อมูลที่จำเป็น: ชื่อบริษัท, ที่อยู่, และเบอร์โทรศัพท์' 
            });
        }

        // เตรียมข้อมูลสำหรับบันทึก
        const companyData = {
            name,
            address,
            phone,
            email,
            taxId,
            website,
            description
        };

        // ถ้ามีการอัปโหลดโลโก้
        if (req.file) {
            companyData.logo = req.file.filename;
        }

        // ค้นหาข้อมูลบริษัทที่มีอยู่
        let company = await Company.findOne();
        
        if (company) {
            // ถ้ามีการอัปโหลดโลโก้ใหม่ ให้ลบโลโก้เก่า
            if (req.file && company.logo) {
                const oldLogoPath = path.join(__dirname, '../uploads', company.logo);
                if (fs.existsSync(oldLogoPath)) {
                    fs.unlinkSync(oldLogoPath);
                }
            }
            
            // อัปเดตข้อมูล
            Object.assign(company, companyData);
            await company.save();
        } else {
            // สร้างใหม่
            company = new Company(companyData);
            await company.save();
        }

        res.json(company);
    } catch (error) {
        console.error('Error saving company:', error);
        
        // ลบไฟล์ที่อัปโหลดถ้าเกิดข้อผิดพลาด
        if (req.file) {
            const filePath = path.join(__dirname, '../uploads', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลบริษัท' });
    }
});

// PUT - อัปเดตข้อมูลบริษัท
router.put('/:id', upload.single('logo'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, phone, email, taxId, website, description } = req.body;
        
        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลบริษัท' });
        }

        // เตรียมข้อมูลสำหรับอัปเดต
        const updateData = {
            name,
            address,
            phone,
            email,
            taxId,
            website,
            description
        };

        // ถ้ามีการอัปโหลดโลโก้ใหม่
        if (req.file) {
            // ลบโลโก้เก่า
            if (company.logo) {
                const oldLogoPath = path.join(__dirname, '../uploads', company.logo);
                if (fs.existsSync(oldLogoPath)) {
                    fs.unlinkSync(oldLogoPath);
                }
            }
            updateData.logo = req.file.filename;
        }

        // อัปเดตข้อมูล
        Object.assign(company, updateData);
        await company.save();

        res.json(company);
    } catch (error) {
        console.error('Error updating company:', error);
        
        // ลบไฟล์ที่อัปโหลดถ้าเกิดข้อผิดพลาด
        if (req.file) {
            const filePath = path.join(__dirname, '../uploads', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลบริษัท' });
    }
});

// DELETE - ลบโลโก้
router.delete('/:id/logo', async (req, res) => {
    try {
        const { id } = req.params;
        
        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลบริษัท' });
        }

        // ลบไฟล์โลโก้
        if (company.logo) {
            const logoPath = path.join(__dirname, '../uploads', company.logo);
            if (fs.existsSync(logoPath)) {
                fs.unlinkSync(logoPath);
            }
        }

        // อัปเดตฐานข้อมูล
        company.logo = null;
        await company.save();

        res.json({ message: 'ลบโลโก้เรียบร้อยแล้ว' });
    } catch (error) {
        console.error('Error deleting logo:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบโลโก้' });
    }
});

module.exports = router;
