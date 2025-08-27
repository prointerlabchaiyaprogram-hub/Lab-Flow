const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  ln: { type: String },
  hn: { type: String },
  idCard: { type: String },

  // ข้อมูลส่วนตัว
  prefix: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  age: { type: Number },
  gender: { type: String },
  birthDate: { type: Date },
  phone: { type: String },
  address: { type: String },
  idCardImage: { type: String },
  dateOfRegister : { type: String },

}, { timestamps: true });


module.exports = mongoose.models.Patient || mongoose.model('Patient', patientSchema);
