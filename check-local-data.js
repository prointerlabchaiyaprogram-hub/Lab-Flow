const mongoose = require('mongoose');

// Connect to local MongoDB
async function checkLocalData() {
  try {
    console.log('🔍 Connecting to local MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/lab-management');
    console.log('✅ Connected to local MongoDB');

    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\n📋 Collections found:');
    collections.forEach(col => console.log(`  - ${col.name}`));

    // Check each collection for data
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`\n📊 ${collection.name}: ${count} documents`);
      
      if (count > 0) {
        // Show sample document
        const sample = await db.collection(collection.name).findOne();
        console.log(`📄 Sample document:`, JSON.stringify(sample, null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Local MongoDB is not running or not installed');
      console.log('   This is normal if you haven\'t used local MongoDB before');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from local MongoDB');
  }
}

checkLocalData();
