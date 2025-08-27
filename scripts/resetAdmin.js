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

const resetAdmin = async () => {
  try {
    await connectDB();

    // Delete existing admin user
    const deleteResult = await User.deleteOne({ email: 'admin@lab-system.com' });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} admin user(s)`);

    // Create new admin user
    const adminUser = new User({
      username: 'admin',
      email: 'admin@lab-system.com',
      password: 'admin123456', // Will be hashed automatically by pre-save middleware
      fullName: 'System Administrator',
      role: 'admin',
      subscriptionStatus: 'active',
      subscriptionPlan: 'enterprise',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      isActive: true
    });

    await adminUser.save();

    console.log('🎉 New admin user created successfully!');
    console.log('');
    console.log('📋 Admin Login Credentials:');
    console.log('   Email: admin@lab-system.com');
    console.log('   Password: admin123456');
    console.log('   Username: admin');
    console.log('   Role: admin');
    console.log('');
    console.log('🔗 Admin URLs:');
    console.log('   Dashboard: http://localhost:8080/admin');
    console.log('   User Management: http://localhost:8080/admin/users');
    console.log('   Payment Management: http://localhost:8080/admin/payments');
    console.log('');
    console.log('✅ Ready to login!');

    // Test password comparison
    const testLogin = await adminUser.comparePassword('admin123456');
    console.log('🔐 Password test:', testLogin ? 'PASS' : 'FAIL');

  } catch (error) {
    console.error('❌ Error resetting admin user:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the script
resetAdmin();
