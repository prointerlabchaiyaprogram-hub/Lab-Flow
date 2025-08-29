const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testFileUpload() {
  try {
    console.log('🧪 Testing file upload API endpoint...');
    
    // Create a test file
    const testContent = 'This is a test PDF file for testing the upload functionality.';
    const testBuffer = Buffer.from(testContent);
    
    // Create FormData
    const formData = new FormData();
    formData.append('orderId', '507f1f77bcf86cd799439011'); // Mock order ID
    formData.append('notes', 'Test upload from script');
    formData.append('files', testBuffer, {
      filename: 'test-upload.pdf',
      contentType: 'application/pdf'
    });
    
    console.log('📤 Sending POST request to /api/test-results...');
    
    const response = await axios.post('https://lab-flow-ixsa.onrender.com/api/test-results', formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000
    });
    
    console.log('✅ Upload successful!');
    console.log('📋 Response:', response.data);
    
  } catch (error) {
    console.error('❌ Upload failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testFileUpload();
