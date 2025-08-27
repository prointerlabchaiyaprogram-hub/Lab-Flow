const express = require('express');
const router = express.Router();
const LabResult = require('../models/LabResult');

// GET ผลตรวจทั้งหมด
router.get('/', async (req, res) => {
  try {
    const results = await LabResult.find()
      .populate('visit')
      .populate('test');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET ผลตรวจตาม visit
router.get('/visit/:visitId', async (req, res) => {
  try {
    const results = await LabResult.find({ visit: req.params.visitId })
      .populate('test');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST สร้างผลตรวจ
router.post('/', async (req, res) => {
  try {
    const { visit, test, resultValue, unit, normalRange, note } = req.body;
    const newResult = new LabResult({ visit, test, resultValue, unit, normalRange, note });
    await newResult.save();
    res.status(201).json(newResult);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT อัปเดตผลตรวจ
router.put('/:id', async (req, res) => {
  try {
    const updatedResult = await LabResult.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedResult) return res.status(404).json({ error: 'ไม่พบผลตรวจ' });
    res.json(updatedResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
