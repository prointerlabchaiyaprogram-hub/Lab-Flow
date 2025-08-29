const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const TestResult = require('../models/TestResult');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for local file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}-${file.originalname}`;
    cb(null, uniqueFileName);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Accept only PDF, JPG, JPEG, PNG files
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, JPEG, and PNG files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});


// GET /api/test-results - Get all test results
router.get('/', async (req, res) => {
  try {
    const testResults = await TestResult.find()
      .populate({
        path: 'order',
        populate: [
          {
            path: 'patient',
            model: 'Patient'
          },
          {
            path: 'visit',
            model: 'Visit',
            populate: {
              path: 'patient',
              model: 'Patient'
            }
          }
        ]
      })
      .sort({ createdAt: -1 });
    res.json(testResults);
  } catch (error) {
    console.error('Error fetching test results:', error);
    res.status(500).json({ error: 'Failed to fetch test results' });
  }
});

// GET /api/test-results/:id - Get specific test result
router.get('/:id', async (req, res) => {
  try {
    const testResult = await TestResult.findById(req.params.id)
      .populate({
        path: 'order',
        populate: [
          {
            path: 'patient',
            model: 'Patient'
          },
          {
            path: 'visit',
            model: 'Visit',
            populate: {
              path: 'patient',
              model: 'Patient'
            }
          }
        ]
      });
    if (!testResult) {
      return res.status(404).json({ error: 'Test result not found' });
    }
    res.json(testResult);
  } catch (error) {
    console.error('Error fetching test result:', error);
    res.status(500).json({ error: 'Failed to fetch test result' });
  }
});

// POST /api/test-results - Create new test result with file uploads
router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    console.log('📥 POST /api/test-results - Request received');
    console.log('📋 Request body:', req.body);
    console.log('📎 Files received:', req.files ? req.files.length : 0);
    
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        console.log(`📄 File ${index + 1}:`, {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          buffer: file.buffer ? `${file.buffer.length} bytes` : 'No buffer'
        });
      });
    }

    const { orderId, notes } = req.body;

    if (!orderId) {
      console.log('❌ Missing orderId');
      return res.status(400).json({ error: 'Order ID is required' });
    }

    if (!req.files || req.files.length === 0) {
      console.log('❌ No files received');
      return res.status(400).json({ error: 'At least one file is required' });
    }

    // Process uploaded files
    const uploadedFiles = req.files.map((file) => {
      const fileUrl = `/uploads/${file.filename}`;
      return {
        fileName: file.filename,
        url: fileUrl,
        path: file.path,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        storage: 'local'
      };
    });

    const testResult = new TestResult({
      order: orderId,
      files: uploadedFiles,
      notes: notes || '',
      status: 'completed'
    });

    await testResult.save();
    
    // อัพเดตสถานะ Visit เป็น completed เมื่อบันทึกผลการตรวจเสร็จ
    const Order = require('../models/Order');
    const Visit = require('../models/Visit');
    
    const order = await Order.findById(orderId);
    if (order && order.visit) {
      await Visit.findByIdAndUpdate(order.visit, { status: 'completed' });
    }
    
    // Populate the saved result before sending response
    const populatedResult = await TestResult.findById(testResult._id)
      .populate({
        path: 'order',
        populate: [
          {
            path: 'patient',
            model: 'Patient'
          },
          {
            path: 'visit',
            model: 'Visit',
            populate: {
              path: 'patient',
              model: 'Patient'
            }
          }
        ]
      });
    
    res.status(201).json({
      message: 'Test result saved successfully',
      testResult: populatedResult
    });
  } catch (error) {
    console.error('Error creating test result:', error);
    res.status(500).json({ error: 'Failed to save test result' });
  }
});

// PUT /api/test-results/:id - Update test result
router.put('/:id', upload.array('files', 10), async (req, res) => {
  try {
    const { notes } = req.body;
    const testResult = await TestResult.findById(req.params.id);

    if (!testResult) {
      return res.status(404).json({ error: 'Test result not found' });
    }

    // Update notes if provided
    if (notes !== undefined) {
      testResult.notes = notes;
    }

    // Add new files if uploaded
    if (req.files && req.files.length > 0) {
      const uploadedFiles = req.files.map((file) => {
        const fileUrl = `/uploads/${file.filename}`;
        return {
          fileName: file.filename,
          url: fileUrl,
          path: file.path,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype
        };
      });

      testResult.files = [...testResult.files, ...uploadedFiles];
    }

    await testResult.save();
    
    const populatedResult = await TestResult.findById(testResult._id)
      .populate({
        path: 'order',
        populate: [
          {
            path: 'patient',
            model: 'Patient'
          },
          {
            path: 'visit',
            model: 'Visit',
            populate: {
              path: 'patient',
              model: 'Patient'
            }
          }
        ]
      });
    
    res.json({
      message: 'Test result updated successfully',
      testResult: populatedResult
    });
  } catch (error) {
    console.error('Error updating test result:', error);
    res.status(500).json({ error: 'Failed to update test result' });
  }
});

// DELETE /api/test-results/:id - Delete test result
router.delete('/:id', async (req, res) => {
  try {
    const testResult = await TestResult.findById(req.params.id);
    
    if (!testResult) {
      return res.status(404).json({ error: 'Test result not found' });
    }

    // Delete local files
    if (testResult.files && testResult.files.length > 0) {
      for (const file of testResult.files) {
        try {
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
            console.log(`✅ Local file deleted: ${file.path}`);
          }
        } catch (error) {
          console.error(`❌ Failed to delete file ${file.path}:`, error);
        }
      }
    }

    // Delete the test result document
    await TestResult.findByIdAndDelete(req.params.id);

    res.json({ message: 'Test result deleted successfully' });
  } catch (error) {
    console.error('Error deleting test result:', error);
    res.status(500).json({ error: 'Failed to delete test result' });
  }
});

// GET /api/test-results/order/:orderId - Get test results for specific order
router.get('/order/:orderId', async (req, res) => {
  try {
    const testResults = await TestResult.find({ order: req.params.orderId })
      .populate({
        path: 'order',
        populate: [
          {
            path: 'patient',
            model: 'Patient'
          },
          {
            path: 'visit',
            model: 'Visit',
            populate: {
              path: 'patient',
              model: 'Patient'
            }
          }
        ]
      })
      .sort({ createdAt: -1 });
    res.json(testResults);
  } catch (error) {
    console.error('Error fetching test results for order:', error);
    res.status(500).json({ error: 'Failed to fetch test results for order' });
  }
});

module.exports = router;
