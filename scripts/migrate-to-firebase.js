const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const TestResult = require('../models/TestResult');
const { uploadFileToFirebase } = require('../firebase-config');

/**
 * Migration script to move existing local files to Firebase Storage
 * Run this script after setting up Firebase configuration
 */
async function migrateTestResultsToFirebase() {
  try {
    console.log('🚀 Starting migration to Firebase Storage...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all test results with old file format (string array)
    const testResults = await TestResult.find({}).lean();
    console.log(`📋 Found ${testResults.length} test results to check`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const result of testResults) {
      try {
        // Check if files are in old format (array of strings)
        const needsMigration = result.files.some(file => typeof file === 'string');
        
        if (!needsMigration) {
          console.log(`⏭️  Skipping ${result._id} - already migrated`);
          skippedCount++;
          continue;
        }

        console.log(`🔄 Migrating test result: ${result._id}`);
        
        const migratedFiles = [];
        
        for (const file of result.files) {
          if (typeof file === 'string') {
            // Old format - file is just a filename
            const localFilePath = path.join(__dirname, '../../uploads', file);
            
            // Check if local file exists
            if (!fs.existsSync(localFilePath)) {
              console.log(`⚠️  Local file not found: ${file}`);
              // Keep the old format for files that don't exist locally
              migratedFiles.push({
                fileName: file,
                url: `http://localhost:5000/uploads/${file}`, // Fallback to local URL
                path: `local/${file}`,
                originalName: file,
                size: 0,
                mimetype: 'unknown'
              });
              continue;
            }

            try {
              // Read file and upload to Firebase
              const fileBuffer = fs.readFileSync(localFilePath);
              const stats = fs.statSync(localFilePath);
              
              // Determine mimetype based on extension
              const ext = path.extname(file).toLowerCase();
              let mimetype = 'application/octet-stream';
              if (ext === '.pdf') mimetype = 'application/pdf';
              else if (['.jpg', '.jpeg'].includes(ext)) mimetype = 'image/jpeg';
              else if (ext === '.png') mimetype = 'image/png';

              // Upload to Firebase
              const uploadResult = await uploadFileToFirebase(fileBuffer, file, 'test-results');
              
              migratedFiles.push({
                fileName: uploadResult.fileName,
                url: uploadResult.url,
                path: uploadResult.path,
                originalName: file,
                size: stats.size,
                mimetype: mimetype
              });

              console.log(`  ✅ Uploaded: ${file} -> ${uploadResult.fileName}`);
              
            } catch (uploadError) {
              console.error(`  ❌ Failed to upload ${file}:`, uploadError.message);
              // Keep the old format as fallback
              migratedFiles.push({
                fileName: file,
                url: `http://localhost:5000/uploads/${file}`,
                path: `local/${file}`,
                originalName: file,
                size: 0,
                mimetype: 'unknown'
              });
            }
          } else {
            // Already in new format
            migratedFiles.push(file);
          }
        }

        // Update the test result with new file format
        await TestResult.findByIdAndUpdate(result._id, {
          files: migratedFiles
        });

        console.log(`  ✅ Updated test result: ${result._id}`);
        migratedCount++;

      } catch (error) {
        console.error(`❌ Error migrating test result ${result._id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Migrated: ${migratedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📋 Total: ${testResults.length}`);

    if (migratedCount > 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('💡 You can now safely delete the local uploads folder if all files were migrated successfully.');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateTestResultsToFirebase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateTestResultsToFirebase };
