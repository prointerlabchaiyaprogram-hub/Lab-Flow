const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testPostRequest() {
  try {
    const form = new FormData();
    form.append('orderId', '68ab5316fa1f93ea9c657856'); // Use existing order ID
    form.append('notes', 'Test result notes');
    
    // Create a dummy file buffer
    const dummyFile = Buffer.from('test file content');
    form.append('files', dummyFile, {
      filename: 'test.pdf',
      contentType: 'application/pdf'
    });

    const response = await fetch('http://localhost:5000/api/test-results', {
      method: 'POST',
      body: form
    });

    console.log('Status:', response.status);
    const result = await response.text();
    console.log('Response:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

testPostRequest();
