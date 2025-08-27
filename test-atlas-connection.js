const mongoose = require('mongoose');
require('dotenv').config();

async function testAtlasConnection() {
  try {
    console.log('🔗 Testing MongoDB Atlas connection...');
    console.log('📋 Connection string:', process.env.MONGO_URI.replace(/:[^:@]*@/, ':***@'));
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Atlas connected successfully!');
    
    // Test database operations
    const testCollection = mongoose.connection.db.collection('test');
    await testCollection.insertOne({ test: 'connection', timestamp: new Date() });
    console.log('✅ Database write test successful!');
    
    const result = await testCollection.findOne({ test: 'connection' });
    console.log('✅ Database read test successful:', result);
    
    await testCollection.deleteOne({ test: 'connection' });
    console.log('✅ Database delete test successful!');
    
  } catch (error) {
    console.error('❌ Atlas connection failed:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.log('\n🔧 Authentication Error Solutions:');
      console.log('1. Check username/password in Atlas Dashboard');
      console.log('2. Ensure database user exists and has correct permissions');
      console.log('3. Check if password contains special characters (needs URL encoding)');
      console.log('4. Verify IP address is whitelisted (0.0.0.0/0 for all IPs)');
    }
    
    if (error.message.includes('network')) {
      console.log('\n🌐 Network Error Solutions:');
      console.log('1. Check internet connection');
      console.log('2. Verify Atlas cluster is running');
      console.log('3. Check firewall settings');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testAtlasConnection();
