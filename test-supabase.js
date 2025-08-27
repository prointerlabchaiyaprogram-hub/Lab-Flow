const { uploadFileToSupabase } = require('./supabase-config');

async function testSupabaseUpload() {
  try {
    console.log('Testing Supabase upload...');
    
    // Create a test file buffer
    const testBuffer = Buffer.from('This is a test PDF content for Supabase');
    
    const result = await uploadFileToSupabase(testBuffer, 'test-supabase.pdf', 'test-results');
    
    console.log('✅ Supabase upload successful:', result);
  } catch (error) {
    console.error('❌ Supabase upload failed:', error);
  }
}

testSupabaseUpload();
