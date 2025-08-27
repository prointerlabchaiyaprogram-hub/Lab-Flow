const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createAdminForLabflow() {
  try {
    console.log('🚀 Creating admin user for labflow database...\n');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas (labflow)');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('✅ Admin user already exists in labflow:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Username: ${existingAdmin.username}`);
      return;
    }
    
    // Create admin user for labflow database
    const adminUser = new User({
      username: 'admin',
      email: 'admin@lab-system.com',
      password: 'admin123456', // Will be hashed automatically
      fullName: 'System Administrator',
      role: 'admin',
      subscriptionStatus: 'active',
      subscriptionPlan: 'enterprise',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)), // 1 year
      isActive: true
    });
    
    await adminUser.save();
    
    console.log('🎉 Admin user created successfully in labflow database!');
    console.log('');
    console.log('📋 Admin Login Credentials:');
    console.log('   Email: admin@lab-system.com');
    console.log('   Password: admin123456');
    console.log('   Username: admin');
    console.log('   Role: admin');
    console.log('');
    console.log('🔗 Admin URLs:');
    console.log('   Login: http://localhost:8081/login');
    console.log('   Dashboard: http://localhost:8081/admin');
    console.log('   User Management: http://localhost:8081/admin/users');
    console.log('   Payment Management: http://localhost:8081/admin/payments');
    console.log('');
    console.log('✅ Ready to login to labflow system!');
    
    // Test password comparison
    const testLogin = await adminUser.comparePassword('admin123456');
    console.log('🔐 Password test:', testLogin ? 'PASS' : 'FAIL');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

createAdminForLabflow();
