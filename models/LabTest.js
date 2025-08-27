//backend/models/LabTest.js
const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },   // รหัสรายการ
  name: { type: String, required: true },                // ชื่อรายการ
  category: { type: String },                            // ชื่อประเภท
  price: { type: Number, required: true },               // ราคา
});

module.exports = mongoose.models.LabTest || mongoose.model('LabTest', labTestSchema);
