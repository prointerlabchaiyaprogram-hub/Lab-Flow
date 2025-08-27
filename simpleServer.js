const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lab-management')
  .then(() => console.log('📦 MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Simple login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Login request:', req.body);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    
    // Find user
    const user = await User.findOne({ email });
    console.log('👤 User found:', user ? 'YES' : 'NO');
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Test password
    const isValid = await user.comparePassword(password);
    console.log('🔑 Password valid:', isValid);
    
    if (!isValid) {
      console.log('❌ Invalid password');
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    console.log('✅ Login successful!');
    
    // Generate simple token (for testing)
    const token = 'test-token-' + Date.now();
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          subscriptionStatus: user.subscriptionStatus,
          canAccess: user.role === 'admin' || user.subscriptionStatus === 'active'
        },
        token
      }
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Simple server running on http://localhost:${PORT}`);
  console.log('📋 Available endpoints:');
  console.log('   POST /api/auth/login');
  console.log('   GET /api/health');
});
