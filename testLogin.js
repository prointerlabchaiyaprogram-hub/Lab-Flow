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

// Simple login test endpoint
app.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login request received:', req.body);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    
    // Find user
    const user = await User.findOne({ email });
    console.log('👤 User found:', user ? 'YES' : 'NO');
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    console.log('🔍 User details:', {
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
    
    // Test password
    console.log('🔑 Testing password comparison...');
    const isValid = await user.comparePassword(password);
    console.log('🔑 Password valid:', isValid);
    
    if (!isValid) {
      console.log('❌ Invalid password');
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }
    
    console.log('✅ Login successful!');
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName
      }
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log('📋 Test login with:');
  console.log('   POST http://localhost:5001/login');
  console.log('   Body: {"email":"admin@lab-system.com","password":"admin123456"}');
});
