// backend/routes/orders.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Order = require("../models/Order"); // ต้องมี model Order

// กำหนดโฟลเดอร์เก็บไฟล์
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // uploads/ ต้องมีจริง
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// API บันทึกผลตรวจแบบรูปภาพ
router.post("/save-results", upload.array("images", 10), async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: "ไม่พบ orderId" });

    const filePaths = req.files.map((f) => `/uploads/${f.filename}`);

    // อัปเดตลง database
    const order = await Order.findByIdAndUpdate(
      orderId,
      { $push: { results: { $each: filePaths } } }, // results เป็น array เก็บ path ของรูป
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: "ไม่พบ Order" });
    }

    res.json({ success: true, order });
  } catch (err) {
    console.error("Save results error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
