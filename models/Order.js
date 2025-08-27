// backend/models/Order.js
const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",   // ✅ reference ผู้ป่วย
    required: true,
  },
  visit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Visit",     // ✅ reference visit
    required: true,
  },
 items: [
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "LabGroup", required: true },
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
    name: { type: String, required: true },
  }
],
  totalAmount: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ["cash", "transfer", "rights"],
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "in-progress", "done", "cancelled"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
  
  // Cancellation fields
  cancelledAt: { type: Date },
  cancelledBy: { type: String },
  cancellationReason: { type: String },

});

module.exports = mongoose.model("Order", OrderSchema);
