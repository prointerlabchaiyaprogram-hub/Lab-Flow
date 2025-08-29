const fs = require('fs');
const path = require('path');

// Test the saveFileLocally function
const uploadsDir = path.join(__dirname, 'uploads');

function saveFileLocally(fileBuffer, originalName) {
  console.log('📦 Starting local file save...');
  console.log('📁 Uploads directory:', uploadsDir);
  console.log('📄 Original filename:', originalName);
  console.log('📊 Buffer size:', fileBuffer.length);
  
  // Check if uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    console.log('🆕 Creating uploads directory...');
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const timestamp = Date.now();
  const uniqueFileName = `${timestamp}-${originalName}`;
  const filePath = path.join(uploadsDir, uniqueFileName);
  
  console.log('💾 Saving to:', filePath);
  
  try {
    fs.writeFileSync(filePath, fileBuffer);
    console.log('✅ File saved successfully!');
    
    // Verify file exists
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log('📊 File size on disk:', stats.size, 'bytes');
    }
    
    return {
      fileName: uniqueFileName,
      url: `/uploads/${uniqueFileName}`,
      path: filePath,
      originalName: originalName,
      size: fileBuffer.length,
      mimetype: 'application/octet-stream'
    };
  } catch (error) {
    console.error('❌ Error saving file:', error);
    throw error;
  }
}

// Test with a sample file
console.log('🧪 Testing file upload functionality...');

const testBuffer = Buffer.from('This is a test PDF file content for testing file upload functionality.');
const testFileName = 'test-result.pdf';

try {
  const result = saveFileLocally(testBuffer, testFileName);
  console.log('🎉 Test successful!');
  console.log('📋 Result:', result);
  
  // List files in uploads directory
  console.log('📂 Files in uploads directory:');
  const files = fs.readdirSync(uploadsDir);
  files.forEach(file => {
    const filePath = path.join(uploadsDir, file);
    const stats = fs.statSync(filePath);
    console.log(`  - ${file} (${stats.size} bytes)`);
  });
  
} catch (error) {
  console.error('❌ Test failed:', error);
}
