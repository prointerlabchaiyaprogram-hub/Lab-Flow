// backend/routes/patient.js
const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');

// Route ค้นหาคนไข้ด้วยเลขบัตรประชาชน
router.get('/search', async (req, res) => {
  try {
    const { idCard } = req.query;
    if (!idCard) {
      return res.status(400).json({ message: 'กรุณาระบุเลขบัตรประชาชน' });
    }

    const patient = await Patient.findOne({ idCard });
    if (!patient) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ป่วย' });
    }

    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all patients or search patients by ?search=xxx
router.get('/', async (req, res) => {
  try {
    const search = req.query.search ? req.query.search.toString().toLowerCase() : '';

    let patients;
    if (search) {
      patients = await Patient.find({
        $or: [
          { hn: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { idCard: { $regex: search, $options: 'i' } },
          { ln: { $regex: search, $options: 'i' } }
        ]
      }).limit(50);
    } else {
      patients = await Patient.find().limit(50); // ดึงทั้งหมดถ้าไม่มี search
    }

    res.json(patients);
  } catch (err) {
    console.error('Patient fetch error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST create new patient
router.post('/', async (req, res) => {
  try {
    console.log('Received patient data:', req.body);
    console.log('LN in received data:', req.body.ln);
    
    // ตรวจสอบและแปลง birthDate
    if (!req.body.birthDate || req.body.birthDate === "") {
      delete req.body.birthDate;
    } else if (typeof req.body.birthDate === "string") {
      req.body.birthDate = new Date(req.body.birthDate);
      if (isNaN(req.body.birthDate.getTime())) {
        delete req.body.birthDate;
      }
    }

    const newPatient = new Patient(req.body);
    console.log('Creating patient with LN:', newPatient.ln);
    
    await newPatient.save();
    console.log('Patient saved successfully with LN:', newPatient.ln);
    
    // ตรวจสอบว่าบันทึกลงฐานข้อมูลจริงหรือไม่
    const savedPatient = await Patient.findById(newPatient._id);
    console.log('Verified saved patient LN:', savedPatient?.ln);
    
    res.status(201).json(newPatient);
  } catch (err) {
    console.error('Patient create error:', err);
    res.status(400).json({ message: err.message, error: err });
  }
});

// PUT update patient by ID
router.put('/:id', async (req, res) => {
  try {
    // ตรวจสอบและแปลง birthDate ถ้ามี
    if (req.body.birthDate && typeof req.body.birthDate === "string") {
      const date = new Date(req.body.birthDate);
      if (!isNaN(date.getTime())) {
        req.body.birthDate = date;
      } else {
        delete req.body.birthDate;
      }
    }

    const updatedPatient = await Patient.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true } // ให้ส่งข้อมูลใหม่กลับ
    );

    if (!updatedPatient) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ป่วย' });
    }

    res.json(updatedPatient);
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' });
  }
});

// GET last ln (ต้องมาก่อน /:id เพื่อไม่ให้ชน)
router.get('/lastLn', async (req, res) => {
  try {
    // สร้างรูปแบบ LN ใหม่: ปีพ.ศ.2หลัก + เดือน2หลัก + ลำดับ4หลัก
    const now = new Date();
    const buddhistYear = now.getFullYear() + 543;
    const yearSuffix = buddhistYear.toString().slice(-2); // เอา 2 หลักท้าย
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const currentPrefix = `${yearSuffix}${month}`; // เช่น "6809"
    
    // ค้นหา LN ที่มีรูปแบบเดียวกันในเดือนปัจจุบัน (รองรับทั้งรูปแบบเก่าที่มี L และใหม่ที่ไม่มี L)
    const patients = await Patient.find({ 
      $or: [
        { ln: { $regex: `^${currentPrefix}` } }, // รูปแบบใหม่: 68090001
        { ln: { $regex: `^L${currentPrefix}` } } // รูปแบบเก่า: L68090001
      ]
    }).exec();
    
    console.log(`Found ${patients.length} patients with prefix ${currentPrefix}`);
    
    let maxSequence = 0;
    
    patients.forEach(patient => {
      if (patient.ln) {
        let sequence = 0;
        
        // ตรวจสอบรูปแบบ LN
        if (patient.ln.startsWith(`L${currentPrefix}`)) {
          // รูปแบบเก่า: L68090001
          sequence = parseInt(patient.ln.slice(-4), 10);
        } else if (patient.ln.startsWith(currentPrefix)) {
          // รูปแบบใหม่: 68090001
          sequence = parseInt(patient.ln.slice(-4), 10);
        }
        
        console.log(`Patient LN: ${patient.ln}, Sequence: ${sequence}`);
        if (!isNaN(sequence) && sequence > maxSequence) {
          maxSequence = sequence;
        }
      }
    });

    console.log(`Max sequence found: ${maxSequence}`);

    // สร้าง LN ใหม่ (เฉพาะตัวเลข ไม่มี L)
    const nextSequence = String(maxSequence + 1).padStart(4, '0');
    const nextLn = `${currentPrefix}${nextSequence}`;
    
    console.log('Generated new LN:', nextLn);
    res.json({ lastLn: nextLn });
  } catch (err) {
    console.error('Error fetching last Ln:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงเลข LN ล่าสุด' });
  }
});

// GET patient by ID
router.get('/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ป่วย' });
    }
    res.json(patient);
  } catch (err) {
    console.error('Get patient error:', err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE patient by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedPatient = await Patient.findByIdAndDelete(req.params.id);
    
    if (!deletedPatient) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ป่วย' });
    }
    
    res.json({ message: 'ลบข้อมูลผู้ป่วยสำเร็จ', patient: deletedPatient });
  } catch (err) {
    console.error('Delete patient error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
