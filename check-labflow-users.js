const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkLabflowUsers() {
  try {
    console.log('🔍 Checking users in labflow database...\n');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas (labflow)');
    
    // Check all users
    const users = await User.find({});
    console.log(`\n👥 Found ${users.length} users in labflow database:`);
    
    if (users.length === 0) {
      console.log('❌ No users found in labflow database!');
      console.log('   This is why login is failing (401 Unauthorized)');
      return;
    }
    
    users.forEach(user => {
      console.log(`\n📋 User: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Full Name: ${user.fullName}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Subscription: ${user.subscriptionStatus}`);
    });
    
    // Check specifically for admin user
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser) {
      console.log('\n✅ Admin user exists in labflow database');
    } else {
      console.log('\n❌ No admin user found in labflow database');
      console.log('   Need to create admin user for labflow database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkLabflowUsers();
