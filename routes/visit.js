// backend/routes/visit.js
const express = require('express');
const router = express.Router();
const Visit = require('../models/Visit');
const Patient = require('../models/Patient');


// GET all visits หรือค้นหาด้วย patientId หรือ search
router.get('/', async (req, res) => {
  try {
    const { patientId, search } = req.query;
    let query = {};
    
    if (patientId) {
      query.patient = patientId;
    } else if (search) {
      // ค้นหาจาก referenceNumber หรือข้อมูลผู้ป่วย
      const patients = await Patient.find({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { ln: { $regex: search, $options: 'i' } },
          { hn: { $regex: search, $options: 'i' } }
        ]
      });
      
      query = {
        $or: [
          { referenceNumber: { $regex: search, $options: 'i' } },
          { patient: { $in: patients.map(p => p._id) } }
        ]
      };
    }

    const visits = await Visit.find(query)
     .populate('patient')
     .sort({ visitDate: -1 })
     .limit(50);

    res.json(visits);
  } catch (err) {
    console.error('Fetch visits error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET next reference number
router.get('/nextReference', async (req, res) => {
  try {
    const now = new Date();
    const yy = now.getFullYear() % 100;
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `${yy}${mm}`; // เช่น 2508

    // หา Visit ล่าสุดที่ตรงกับ prefix
    const lastVisit = await Visit.findOne({ referenceNumber: { $regex: `^${prefix}` } })
      .sort({ referenceNumber: -1 });

    let seq = 1;
    if (lastVisit && lastVisit.referenceNumber) {
      seq = parseInt(lastVisit.referenceNumber.slice(4)) + 1; // เอาตัวเลขหลัง prefix +1
    }

    const nextReference = `${prefix}${String(seq).padStart(4, '0')}`; // YYMM0001
    res.json({ nextReference });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET last reference number ตาม prefix YYMM
router.get('/lastReference', async (req, res) => {
    try {
        const now = new Date();
        const yy = now.getFullYear() % 100;
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `${yy}${mm}`;

        // หา Visit ล่าสุดที่ตรงกับ prefix
        const lastVisit = await Visit.findOne({ referenceNumber: { $regex: `^${prefix}` } })
            .sort({ referenceNumber: -1 });

        const lastReference = lastVisit ? lastVisit.referenceNumber : null;
        res.json({ lastReference });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงเลข Visit ล่าสุด' });
    }
});

// 🔍 ค้นหาคนไข้ด้วยเลขอ้างอิง (referenceNumber)
router.get("/search/:referenceNumber", async (req, res) => {
  try {
    const visit = await Visit.findOne({ referenceNumber: req.params.referenceNumber })
      .populate("patient"); // ดึงข้อมูลคนไข้มาเลย

    if (!visit) return res.status(404).json({ message: "ไม่พบข้อมูล visit" });

    res.json(visit);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// GET visit by referenceNumber
router.get('/:referenceNumber', async (req, res) => {
  try {
    const visit = await Visit.findOne({ referenceNumber: req.params.referenceNumber })
      .populate('patient');

    if (!visit) return res.status(404).json({ message: 'ไม่พบ Visit' });
    res.json(visit);
  } catch (err) {
    console.error('Fetch visit error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST create new visit
router.post('/', async (req, res) => {
  try {
    const { patient: patientId } = req.body;
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ message: 'ไม่พบผู้ป่วย' });

    // เรียก nextReference จาก database
    const now = new Date();
    const yy = now.getFullYear() % 100;
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `${yy}${mm}`;
    const lastVisit = await Visit.findOne({ referenceNumber: { $regex: `^${prefix}` } })
      .sort({ referenceNumber: -1 });
    let seq = 1;
    if (lastVisit && lastVisit.referenceNumber) seq = parseInt(lastVisit.referenceNumber.slice(4)) + 1;
    const referenceNumber = `${prefix}${String(seq).padStart(4, '0')}`;

    const newVisit = new Visit({ ...req.body, referenceNumber });
    await newVisit.save();
    res.status(201).json(newVisit);
  } catch (err) {
    console.error('Create visit error:', err);
    res.status(400).json({ message: err.message, error: err });
  }
});

// PUT update visit by id
router.put('/:id', async (req, res) => {
  try {
    const updatedVisit = await Visit.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('patient');

    if (!updatedVisit) return res.status(404).json({ message: 'ไม่พบ Visit' });
    res.json(updatedVisit);
  } catch (err) {
    console.error('Update visit error:', err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE visit by id
router.delete('/:id', async (req, res) => {
  try {
    const deletedVisit = await Visit.findByIdAndDelete(req.params.id);
    
    if (!deletedVisit) return res.status(404).json({ message: 'ไม่พบ Visit' });
    res.json({ message: 'ลบ Visit สำเร็จ', visit: deletedVisit });
  } catch (err) {
    console.error('Delete visit error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET unique organizations for filtering
router.get('/organizations/list', async (req, res) => {
  try {
    const organizations = await Visit.distinct('organization', {
      organization: { $exists: true, $ne: '', $ne: null }
    });
    
    const filteredOrgs = organizations
      .filter(org => org && org.trim() !== '')
      .sort();
    
    console.log('Organizations found:', filteredOrgs);
    res.json(filteredOrgs);
  } catch (err) {
    console.error('Fetch organizations error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
