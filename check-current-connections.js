const mongoose = require('mongoose');
require('dotenv').config();

async function checkCurrentConnections() {
  try {
    console.log('🔍 Checking current database connections...\n');
    
    // Check what's in .env
    console.log('📋 Environment variables:');
    console.log(`MONGO_URI: ${process.env.MONGO_URI}`);
    console.log('');
    
    // Test connection to current MONGO_URI
    console.log('🔗 Testing connection to configured database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected successfully');
    
    // Check which database we're connected to
    const db = mongoose.connection.db;
    const admin = db.admin();
    const serverStatus = await admin.serverStatus();
    
    console.log(`📊 Connected to: ${serverStatus.host}`);
    console.log(`🏷️  Database name: ${db.databaseName}`);
    
    // List collections and count documents
    const collections = await db.listCollections().toArray();
    console.log(`\n📁 Collections found: ${collections.length}`);
    
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`  - ${collection.name}: ${count} documents`);
    }
    
    // Check if this is Atlas or local
    const isAtlas = serverStatus.host.includes('mongodb.net') || serverStatus.host.includes('cluster');
    const isLocal = serverStatus.host.includes('localhost') || serverStatus.host.includes('127.0.0.1');
    
    console.log(`\n🏗️  Database type: ${isAtlas ? 'MongoDB Atlas ☁️' : isLocal ? 'Local MongoDB 💻' : 'Unknown'}`);
    
    if (isLocal) {
      console.log('⚠️  WARNING: Still connected to LOCAL MongoDB!');
      console.log('   Frontend may still be showing old local data');
    } else if (isAtlas) {
      console.log('✅ Connected to MongoDB Atlas - All good!');
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected');
  }
}

checkCurrentConnections();
