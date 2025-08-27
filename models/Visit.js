const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  referenceNumber: { type: String, required: true, unique: true }, // เลขอ้างอิง Visit
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, // เชื่อมกับ Patient
  visitDate: { type: Date, default: Date.now }, // วันที่มาเยี่ยม

  organization: { type: String },
  otherOrganization: { type: String },
  rights: { type: String },

  // ข้อมูลร่างกาย
  weight: { type: Number, min: 0 },    
  height: { type: Number, min: 0 },
  bloodPressure: { type: String },
  pulse: { type: Number, min: 0 },

  // ข้อมูลทางการแพทย์
  medicalHistory: { type: String },
  symptoms: { type: String },

  reason: { type: String }, // สาเหตุการมา
  doctor: { type: String }, // พบแพทย์คนไหน
  status: { type: String, enum: ['pending', 'processing', 'completed'], default: 'pending' }, 


  
}, { timestamps: true }); // เพิ่ม createdAt, updatedAt อัตโนมัติ

module.exports = mongoose.models.Visit || mongoose.model('Visit', visitSchema);
