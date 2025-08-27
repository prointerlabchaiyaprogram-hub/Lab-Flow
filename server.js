require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const mongoose = require("mongoose");
const path = require("path");


const patientRouter = require('./routes/patient');
const visitRouter = require('./routes/visit')
const orderRoutes = require("./routes/orders");
const uploadRoutes = require("./routes/upload");
const labItemsRouter = require('./routes/labItems');
const labGroupsRouter = require('./routes/labGroups');
const testResultsRouter = require('./routes/testResults');
const companiesRouter = require('./routes/companies');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const reportsRouter = require('./routes/reports');

const app = express();

// เชื่อมต่อ DB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} ${req.method} ${req.url}`, req.body ? JSON.stringify(req.body) : '');
  next();
});

// Routes
app.use('/api/patients', patientRouter);
app.use("/api/orders", orderRoutes);
app.use("/api/upload", uploadRoutes);
app.use('/api/visits', visitRouter);
app.use('/api/lab-items', labItemsRouter);
app.use('/api/lab-groups', labGroupsRouter);
app.use('/api/test-results', testResultsRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/reports', reportsRouter);

// Health check
app.get('/', (req, res) => {
  res.send(' API is running...');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Test endpoint to verify debug middleware
app.get('/api/test', (req, res) => {
  console.log('🧪 Test endpoint hit!');
  res.json({ message: 'Test endpoint working', timestamp: new Date().toISOString() });
});

// Minimal auth test endpoint
app.post('/api/auth/test-login', async (req, res) => {
  console.log('🔐 Test login endpoint hit!', req.body);
  const User = require('./models/User');
  
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    const isValid = await user.comparePassword(password);
    console.log('🔑 Password valid:', isValid);
    
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }
    
    console.log('✅ Test login successful!');
    res.json({ success: true, message: 'Test login successful', role: user.role });
    
  } catch (error) {
    console.error('❌ Test login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// เริ่ม server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
