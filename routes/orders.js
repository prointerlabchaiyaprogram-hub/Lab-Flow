// backend/routes/order.js
const express = require("express");
const Order = require("../models/Order");

const router = express.Router();

// สร้าง order
router.post("/", async (req, res) => {
  try {
    const { patient, visit, items, totalAmount, paymentMethod } = req.body;

    const order = await Order.create({ patient, visit, items, totalAmount, paymentMethod });
    await order.populate(["patient", "visit"]);

    // อัพเดตสถานะ Visit เป็น processing เมื่อบันทึกการซื้อรายการตรวจเสร็จ
    const Visit = require("../models/Visit");
    await Visit.findByIdAndUpdate(visit, { status: 'processing' });

    res.status(201).json(order);
  } catch (err) {
    console.error("Order creation error:", err);
    res.status(400).json({ message: err.message });
  }
});

// ดึง order
router.get("/", async (req, res) => {
  try {
    const { visitId, patientId } = req.query;
    
    // Build filter object
    let filter = {};
    if (visitId) {
      filter.visit = visitId;
    }
    if (patientId) {
      filter.patient = patientId;
    }
    
    console.log('Orders filter:', filter);
    
    const orders = await Order.find(filter)
      .populate("patient")
      .populate("visit")
      .populate({
        path: "items.item",
        model: "LabGroup"
      });
      
    console.log(`Found ${orders.length} orders with filter:`, filter);
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: err.message });
  }
});

// ยกเลิก order
router.put("/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, username, password } = req.body;

    if (!reason || !username || !password) {
      return res.status(400).json({ 
        message: "กรุณาระบุเหตุผล username และ password" 
      });
    }

    // Verify user credentials
    const User = require("../models/User");
    const bcrypt = require("bcrypt");
    
    const user = await User.findOne({ username });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ 
        message: "Username หรือ Password ไม่ถูกต้อง" 
      });
    }

    // Find and update order
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "ไม่พบรายการขาย" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ message: "รายการขายนี้ถูกยกเลิกแล้ว" });
    }

    // Update order status to cancelled
    order.status = "cancelled";
    order.cancelledAt = new Date();
    order.cancelledBy = username;
    order.cancellationReason = reason;
    
    await order.save();

    // Update visit status back to pending if needed
    const Visit = require("../models/Visit");
    await Visit.findByIdAndUpdate(order.visit, { status: 'pending' });

    res.json({ 
      message: "ยกเลิกรายการขายเรียบร้อยแล้ว",
      order: order
    });

  } catch (err) {
    console.error("Order cancellation error:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
