const mongoose = require('mongoose');
require('dotenv').config();

// Connection strings
const LOCAL_MONGO_URI = 'mongodb://localhost:27017/lab-management';
const ATLAS_MONGO_URI = process.env.MONGO_URI;

async function migrateToAtlas() {
  let localConnection, atlasConnection;
  
  try {
    console.log('🚀 Starting migration from Local MongoDB to Atlas...\n');
    
    // Connect to both databases
    console.log('🔗 Connecting to Local MongoDB...');
    localConnection = await mongoose.createConnection(LOCAL_MONGO_URI);
    await new Promise(resolve => localConnection.once('open', resolve));
    console.log('✅ Connected to Local MongoDB');
    
    console.log('🔗 Connecting to MongoDB Atlas...');
    atlasConnection = await mongoose.createConnection(ATLAS_MONGO_URI);
    await new Promise(resolve => atlasConnection.once('open', resolve));
    console.log('✅ Connected to MongoDB Atlas\n');
    
    // Get collections from local database
    const localDb = localConnection.db;
    const collections = await localDb.listCollections().toArray();
    console.log('📋 Collections to migrate:');
    collections.forEach(col => console.log(`  - ${col.name}`));
    console.log('');
    
    let totalMigrated = 0;
    
    // Migrate each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`📦 Migrating ${collectionName}...`);
      
      // Get all documents from local collection
      const localCollection = localDb.collection(collectionName);
      const documents = await localCollection.find({}).toArray();
      
      if (documents.length === 0) {
        console.log(`  ⚠️  ${collectionName}: No documents to migrate`);
        continue;
      }
      
      // Insert documents into Atlas collection
      const atlasDb = atlasConnection.db;
      const atlasCollection = atlasDb.collection(collectionName);
      
      try {
        // Clear existing data in Atlas collection (optional)
        await atlasCollection.deleteMany({});
        
        // Insert all documents
        const result = await atlasCollection.insertMany(documents);
        console.log(`  ✅ ${collectionName}: ${result.insertedCount} documents migrated`);
        totalMigrated += result.insertedCount;
        
        // Special handling for testresults - check file references
        if (collectionName === 'testresults') {
          console.log(`  📄 Checking file references in testresults...`);
          const resultsWithFiles = documents.filter(doc => doc.files && doc.files.length > 0);
          console.log(`  📎 Found ${resultsWithFiles.length} test results with file attachments`);
          
          resultsWithFiles.forEach(result => {
            console.log(`    - Result ID: ${result._id}, Files: ${result.files.join(', ')}`);
          });
        }
        
      } catch (error) {
        console.error(`  ❌ Error migrating ${collectionName}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Total documents migrated: ${totalMigrated}`);
    
    // Verify migration
    console.log('\n🔍 Verifying migration...');
    for (const collection of collections) {
      const localCount = await localDb.collection(collection.name).countDocuments();
      const atlasCount = await atlasConnection.db.collection(collection.name).countDocuments();
      
      if (localCount === atlasCount) {
        console.log(`✅ ${collection.name}: ${localCount} → ${atlasCount} documents`);
      } else {
        console.log(`⚠️  ${collection.name}: ${localCount} → ${atlasCount} documents (mismatch!)`);
      }
    }
    
    console.log('\n📝 Important Notes:');
    console.log('- All data has been migrated to MongoDB Atlas');
    console.log('- File references in testresults still point to local/Supabase files');
    console.log('- Image files (ID cards, test result images) remain in Supabase Storage');
    console.log('- Company logos remain in local uploads folder (consider moving to Supabase)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    // Close connections
    if (localConnection) {
      await localConnection.close();
      console.log('\n🔌 Disconnected from Local MongoDB');
    }
    if (atlasConnection) {
      await atlasConnection.close();
      console.log('🔌 Disconnected from MongoDB Atlas');
    }
  }
}

// Run migration
migrateToAtlas().catch(console.error);
