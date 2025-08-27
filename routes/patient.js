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
    await newPatient.save();
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

// GET last ln
router.get('/lastLn', async (req, res) => {
  try {
    // ดึง patient ที่ ln มากที่สุด (เรียงจากเลข)
    const lastPatient = await Patient.findOne({ ln: { $exists: true } })
      .sort({ ln: -1 }) // เรียงจากมากไปน้อย
      .exec();

    let lastLn = 'L0'; // default ถ้าไม่มี ln ใน DB
    if (lastPatient && lastPatient.ln) {
      lastLn = lastPatient.ln;
    }

    res.json({ lastLn });
  } catch (err) {
    console.error('Error fetching last Ln:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงเลข LN ล่าสุด' });
  }
});

module.exports = router;
