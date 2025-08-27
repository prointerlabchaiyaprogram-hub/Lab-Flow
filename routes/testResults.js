const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const TestResult = require('../models/TestResult');
const { uploadFileToSupabase, deleteFileFromSupabase } = require('../supabase-config');

// Configure multer for file uploads (Supabase + local fallback)
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Use memory storage for Supabase, with local fallback
const storage = multer.memoryStorage();

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

// Helper function to save file locally as fallback
function saveFileLocally(fileBuffer, originalName) {
  const timestamp = Date.now();
  const uniqueFileName = `${timestamp}-${originalName}`;
  const filePath = path.join(uploadsDir, uniqueFileName);
  
  fs.writeFileSync(filePath, fileBuffer);
  
  return {
    fileName: uniqueFileName,
    url: `/uploads/${uniqueFileName}`,
    path: filePath,
    originalName: originalName,
    size: fileBuffer.length,
    mimetype: 'application/octet-stream'
  };
}

// GET /api/test-results - Get all test results
router.get('/', async (req, res) => {
  try {
    const testResults = await TestResult.find().sort({ createdAt: -1 });
    res.json(testResults);
  } catch (error) {
    console.error('Error fetching test results:', error);
    res.status(500).json({ error: 'Failed to fetch test results' });
  }
});

// GET /api/test-results/:id - Get specific test result
router.get('/:id', async (req, res) => {
  try {
    const testResult = await TestResult.findById(req.params.id);
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
    const { orderId, notes } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'At least one file is required' });
    }

    // Try Supabase first, fallback to local storage
    const uploadedFiles = [];
    
    for (const file of req.files) {
      let uploaded = false;
      
      // Try Supabase first
      try {
        console.log(`📦 Attempting Supabase upload for: ${file.originalname}`);
        const supabaseResult = await uploadFileToSupabase(file.buffer, file.originalname, 'test-results');
        
        uploadedFiles.push({
          fileName: supabaseResult.fileName,
          url: supabaseResult.url,
          path: supabaseResult.path,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          storage: 'supabase'
        });
        
        console.log(`✅ Supabase upload successful: ${file.originalname}`);
        uploaded = true;
      } catch (supabaseError) {
        console.log(`❌ Supabase failed for ${file.originalname}, using local storage`);
      }
      
      // Use local storage as fallback
      if (!uploaded) {
        const localResult = saveFileLocally(file.buffer, file.originalname);
        uploadedFiles.push({
          ...localResult,
          mimetype: file.mimetype,
          storage: 'local'
        });
        
        console.log(`✅ Local storage successful: ${file.originalname}`);
      }
    }

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
    const populatedResult = await TestResult.findById(testResult._id);
    
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
    
    const populatedResult = await TestResult.findById(testResult._id);
    
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

    // Delete files from local storage
    if (testResult.files && testResult.files.length > 0) {
      testResult.files.forEach(file => {
        if (file.path && fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
            console.log(`File deleted: ${file.path}`);
          } catch (error) {
            console.error(`Failed to delete file ${file.path}:`, error);
          }
        }
      });
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
    const testResults = await TestResult.find({ order: req.params.orderId }).sort({ createdAt: -1 });
    res.json(testResults);
  } catch (error) {
    console.error('Error fetching test results for order:', error);
    res.status(500).json({ error: 'Failed to fetch test results for order' });
  }
});

module.exports = router;
