const mongoose = require('mongoose');

const labResultSchema = new mongoose.Schema({
  visit: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit', required: true }, // visit ที่ส่งตรวจ
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'LabTest', required: true }, // รายการ LabTest
  resultValue: { type: String },        // ค่าผลตรวจ
  unit: { type: String },               // หน่วย
  normalRange: { type: String },        // ค่าปกติ
  note: { type: String },               // หมายเหตุเพิ่มเติม
  date: { type: Date, default: Date.now }, // วันที่บันทึกผล
});

module.exports = mongoose.models.LabResult || mongoose.model('LabResult', labResultSchema);
