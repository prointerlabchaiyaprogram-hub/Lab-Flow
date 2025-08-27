const express = require('express');
const router = express.Router();
const LabTest = require('../models/LabTest');

// GET: ดึงรายการทั้งหมด
router.get('/', async (req, res) => {
  try {
    const items = await LabTest.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: เพิ่มรายการใหม่
router.post('/', async (req, res) => {
  try {
    const newItem = new LabTest(req.body);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT: แก้ไขรายการ
router.put('/:id', async (req, res) => {
  try {
    const updatedItem = await LabTest.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedItem) return res.status(404).json({ error: 'ไม่พบรายการ' });
    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE: ลบรายการ
router.delete('/:id', async (req, res) => {
  try {
    const deletedItem = await LabTest.findByIdAndDelete(req.params.id);
    if (!deletedItem) return res.status(404).json({ error: 'ไม่พบรายการ' });
    res.json({ message: 'ลบสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;