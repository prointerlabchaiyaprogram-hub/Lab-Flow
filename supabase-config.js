const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Upload file to Supabase Storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - File name
 * @param {string} bucket - Storage bucket (default: 'test-results')
 * @returns {Promise<{url: string, path: string, fileName: string}>}
 */
async function uploadFileToSupabase(fileBuffer, fileName, bucket = 'test-results') {
  try {
    console.log('📦 Starting Supabase upload:', { fileName, bucket, bufferSize: fileBuffer.length });
    
    // Create unique filename with timestamp
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}-${fileName}`;
    const filePath = `${uniqueFileName}`;
    
    console.log('📦 Upload path:', filePath);
    
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType: 'application/octet-stream',
        duplex: false
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    console.log('✅ Supabase upload successful:', urlData.publicUrl);

    return {
      url: urlData.publicUrl,
      path: filePath,
      fileName: uniqueFileName
    };
  } catch (error) {
    console.error('❌ Supabase upload error:', error);
    throw new Error(`Failed to upload file to Supabase: ${error.message}`);
  }
}

/**
 * Delete file from Supabase Storage
 * @param {string} filePath - Storage path of the file
 * @param {string} bucket - Storage bucket (default: 'test-results')
 * @returns {Promise<void>}
 */
async function deleteFileFromSupabase(filePath, bucket = 'test-results') {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      throw error;
    }

    console.log(`✅ File deleted successfully: ${filePath}`);
  } catch (error) {
    console.error('❌ Error deleting file from Supabase:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

module.exports = {
  uploadFileToSupabase,
  deleteFileFromSupabase,
  supabase
};
