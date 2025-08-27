const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lab-management');
    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const createAdmin = async () => {
  try {
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('✅ Admin user already exists:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Full Name: ${existingAdmin.fullName}`);
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      username: 'admin',
      email: 'admin@lab-system.com',
      password: 'admin123456', // Will be hashed automatically
      fullName: 'System Administrator',
      role: 'admin',
      subscriptionStatus: 'active', // Admin doesn't need subscription but set as active
      subscriptionPlan: 'enterprise',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      isActive: true
    });

    await adminUser.save();

    console.log('🎉 Admin user created successfully!');
    console.log('');
    console.log('📋 Admin Login Credentials:');
    console.log('   Email: admin@lab-system.com');
    console.log('   Password: admin123456');
    console.log('   Username: admin');
    console.log('');
    console.log('🔗 Admin URLs:');
    console.log('   Dashboard: http://localhost:8080/admin');
    console.log('   User Management: http://localhost:8080/admin/users');
    console.log('   Payment Management: http://localhost:8080/admin/payments');
    console.log('');
    console.log('⚠️  IMPORTANT: Please change the admin password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the script
createAdmin();
