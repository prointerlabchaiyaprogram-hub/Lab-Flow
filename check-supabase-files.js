const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkSupabaseFiles() {
  try {
    console.log('🔍 Checking files in Supabase Storage...\n');
    
    // List all files in test-results bucket
    const { data: files, error } = await supabase.storage
      .from('test-results')
      .list('', {
        limit: 100,
        offset: 0
      });

    if (error) {
      console.error('❌ Error listing files:', error.message);
      return;
    }

    console.log(`📁 Found ${files.length} files in Supabase Storage:`);
    
    if (files.length === 0) {
      console.log('  📄 No files found in test-results bucket');
      return;
    }

    // Group files by type
    const imageFiles = [];
    const pdfFiles = [];
    const otherFiles = [];

    files.forEach(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        imageFiles.push(file);
      } else if (ext === 'pdf') {
        pdfFiles.push(file);
      } else {
        otherFiles.push(file);
      }
    });

    console.log(`\n📊 File breakdown:`);
    console.log(`  🖼️  Images: ${imageFiles.length} files`);
    console.log(`  📄 PDFs: ${pdfFiles.length} files`);
    console.log(`  📎 Others: ${otherFiles.length} files`);

    console.log(`\n📋 File details:`);
    files.forEach(file => {
      const sizeKB = Math.round(file.metadata?.size / 1024) || 'Unknown';
      const lastModified = new Date(file.updated_at).toLocaleString('th-TH');
      console.log(`  - ${file.name} (${sizeKB} KB, ${lastModified})`);
    });

    // Calculate total storage used
    const totalSize = files.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
    const totalMB = Math.round(totalSize / (1024 * 1024) * 100) / 100;
    
    console.log(`\n💾 Storage usage: ${totalMB} MB / 1000 MB (${Math.round(totalMB/10)}% used)`);

    // Check if files are accessible
    console.log(`\n🔗 Testing file accessibility...`);
    if (files.length > 0) {
      const testFile = files[0];
      const { data: publicUrl } = supabase.storage
        .from('test-results')
        .getPublicUrl(testFile.name);
      
      console.log(`✅ Sample file URL: ${publicUrl.publicUrl}`);
    }

  } catch (error) {
    console.error('❌ Error checking Supabase files:', error.message);
  }
}

checkSupabaseFiles();
