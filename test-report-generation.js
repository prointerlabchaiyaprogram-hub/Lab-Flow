const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const Visit = require('./models/Visit');
const Patient = require('./models/Patient');
require('dotenv').config();

async function testReportGeneration() {
  try {
    console.log('🔍 Testing report generation with actual data...\n');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');
    
    // Fetch visits with populated patient data (same as in reports.js)
    const visits = await Visit.find({})
      .populate('patient')
      .sort({ createdAt: -1 });

    console.log(`\n📊 Found ${visits.length} visits`);
    
    if (visits.length === 0) {
      console.log('❌ No visits found!');
      return;
    }

    // Create new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('ข้อมูลรายชื่อลงทะเบียน');

    // Define columns (same as in reports.js)
    worksheet.columns = [
      { header: 'เลขที่อ้างอิง', key: 'referenceNumber', width: 15 },
      { header: 'LN', key: 'ln', width: 10 },
      { header: 'เลขบัตรประชาชน', key: 'idCard', width: 18 },
      { header: 'คำนำหน้า', key: 'prefix', width: 10 },
      { header: 'ชื่อ', key: 'firstName', width: 15 },
      { header: 'นามสกุล', key: 'lastName', width: 15 },
      { header: 'อายุ', key: 'age', width: 8 },
      { header: 'วันเกิด', key: 'birthdate', width: 12 },
      { header: 'เพศ', key: 'gender', width: 8 },
      { header: 'เบอร์โทร', key: 'phone', width: 12 }
    ];

    // Add data rows
    visits.forEach((visit, index) => {
      const patient = visit.patient;
      
      console.log(`\n📋 Processing Visit ${index + 1}:`);
      console.log(`   Reference: ${visit.referenceNumber || 'N/A'}`);
      
      if (!patient) {
        console.log(`   ❌ No patient data for this visit`);
        return;
      }

      console.log(`   Patient: ${patient.firstName} ${patient.lastName}`);
      console.log(`   Raw birthDate: ${patient.birthDate}`);
      console.log(`   Raw gender: "${patient.gender}"`);
      
      // Format birthDate
      let formattedBirthDate = '';
      if (patient.birthDate) {
        formattedBirthDate = new Date(patient.birthDate).toLocaleDateString('th-TH');
        console.log(`   Formatted birthDate: ${formattedBirthDate}`);
      } else {
        console.log(`   ❌ No birthDate to format`);
      }

      const rowData = {
        referenceNumber: visit.referenceNumber || '',
        ln: patient.ln || '',
        idCard: patient.idCard || '',
        prefix: patient.prefix || '',
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        age: patient.age || '',
        birthdate: formattedBirthDate,
        gender: patient.gender || '',
        phone: patient.phone || ''
      };

      console.log(`   Row data - birthdate: "${rowData.birthdate}", gender: "${rowData.gender}"`);

      const row = worksheet.addRow(rowData);
    });

    // Save to file for testing
    const filename = `test-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    await workbook.xlsx.writeFile(filename);
    
    console.log(`\n✅ Test report saved as: ${filename}`);
    console.log('📁 Check the backend folder for the generated file');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testReportGeneration();
