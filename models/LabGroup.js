const mongoose = require('mongoose');

const labGroupSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },  // รหัสกลุ่ม
  name: { type: String, required: true },               // ชื่อกลุ่ม
  price: { type: Number, required: true },              // ราคากลุ่ม
  tests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LabTest' }], // ประกอบด้วย LabTest อะไรบ้าง
});

module.exports = mongoose.models.LabGroup || mongoose.model('LabGroup', labGroupSchema);
