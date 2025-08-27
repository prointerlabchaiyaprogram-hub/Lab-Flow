const express = require('express');
const router = express.Router();
const LabGroup = require('../models/LabGroup');
const LabTest = require('../models/LabTest');

// GET all lab groups พร้อมรายละเอียด LabTest
router.get('/', async (req, res) => {
  try {
    const groups = await LabGroup.find().populate('tests'); // populate เพื่อดึงข้อมูล test
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create new lab group
router.post('/', async (req, res) => {
  try {
    const { code, name, price, tests } = req.body; // tests = array ของ LabTest _id
    const newGroup = new LabGroup({ code, name, price, tests });
    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update lab group
router.put('/:id', async (req, res) => {
  try {
    const { code, name, price, tests } = req.body;
    const updatedGroup = await LabGroup.findByIdAndUpdate(
      req.params.id,
      { code, name, price, tests },
      { new: true }
    ).populate('tests'); // populate อีกครั้ง
    if (!updatedGroup) return res.status(404).json({ message: 'ไม่พบกลุ่ม' });
    res.json(updatedGroup);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE lab group
router.delete('/:id', async (req, res) => {
  try {
    const deletedGroup = await LabGroup.findByIdAndDelete(req.params.id);
    if (!deletedGroup) return res.status(404).json({ message: 'ไม่พบกลุ่ม' });
    res.json({ message: 'ลบสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
