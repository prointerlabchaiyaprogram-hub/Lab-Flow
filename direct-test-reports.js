const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const Visit = require('./models/Visit');
const Patient = require('./models/Patient');
require('dotenv').config();

async function directTestReports() {
  try {
    console.log('🔍 Direct test of report generation logic...\n');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');
    
    // Fetch visits with populated patient data (exact same query as reports.js)
    const visits = await Visit.find({})
      .populate('patient')
      .sort({ createdAt: -1 });

    console.log(`\n📊 Found ${visits.length} visits`);
    
    if (visits.length === 0) {
      console.log('❌ No visits found!');
      return;
    }

    // Process each visit exactly like in reports.js
    visits.forEach((visit, index) => {
      const patient = visit.patient;
      
      console.log(`\n=== Processing visit ${index + 1}: ${visit.referenceNumber} ===`);
      
      if (!patient) {
        console.log(`❌ Visit ${visit._id} has no patient data`);
        return;
      }

      console.log(`Raw patient data:`, {
        _id: patient._id,
        birthDate: patient.birthDate,
        gender: patient.gender,
        firstName: patient.firstName,
        lastName: patient.lastName
      });

      // Format birthDate properly (exact same logic as reports.js)
      let formattedBirthDate = '';
      if (patient.birthDate) {
        try {
          formattedBirthDate = new Date(patient.birthDate).toLocaleDateString('th-TH');
          console.log(`✅ Formatted birthDate: "${formattedBirthDate}"`);
        } catch (error) {
          console.error(`❌ Error formatting birthDate: ${error.message}`);
          formattedBirthDate = patient.birthDate.toString();
        }
      } else {
        console.log(`❌ No birthDate found for patient`);
      }

      // Check gender (exact same logic as reports.js)
      const genderValue = patient.gender || '';
      console.log(`✅ Gender value: "${genderValue}"`);
      
      console.log(`Final values - birthdate: "${formattedBirthDate}", gender: "${genderValue}"`);

      // Create the exact same rowData object as in reports.js
      const rowData = {
        referenceNumber: visit.referenceNumber || '',
        ln: patient.ln || '',
        idCard: patient.idCard || '',
        prefix: patient.prefix || '',
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        age: patient.age || '',
        birthdate: formattedBirthDate,
        gender: genderValue,
        phone: patient.phone || '',
        weight: visit.weight || '',
        height: visit.height || '',
        bloodPressure: visit.bloodPressure || '',
        pulse: visit.pulse || '',
        address: patient.address || '',
        organization: visit.organization || '',
        otherOrganization: visit.otherOrganization || '',
        rights: visit.rights || '',
        registrationDate: patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('th-TH') : '',
        visitDate: visit.visitDate ? new Date(visit.visitDate).toLocaleDateString('th-TH') : ''
      };

      console.log(`\n📋 Final rowData object:`);
      console.log(`   birthdate: "${rowData.birthdate}"`);
      console.log(`   gender: "${rowData.gender}"`);
      console.log(`   firstName: "${rowData.firstName}"`);
      console.log(`   lastName: "${rowData.lastName}"`);
    });

    // Now create Excel file with the same data
    console.log(`\n📄 Creating Excel file...`);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('ข้อมูลรายชื่อลงทะเบียน');

    // Set column headers (exact same as reports.js)
    worksheet.columns = [
      { header: 'เลขอ้างอิง', key: 'referenceNumber', width: 15 },
      { header: 'LN', key: 'ln', width: 12 },
      { header: 'เลขบัตรประชาชน', key: 'idCard', width: 18 },
      { header: 'คำนำหน้า', key: 'prefix', width: 10 },
      { header: 'ชื่อ', key: 'firstName', width: 15 },
      { header: 'นามสกุล', key: 'lastName', width: 15 },
      { header: 'อายุ', key: 'age', width: 8 },
      { header: 'วันเกิด', key: 'birthdate', width: 12 },
      { header: 'เพศ', key: 'gender', width: 8 },
      { header: 'เบอร์โทร', key: 'phone', width: 12 },
      { header: 'น้ำหนัก', key: 'weight', width: 10 },
      { header: 'ส่วนสูง', key: 'height', width: 10 },
      { header: 'ความดันโลหิต', key: 'bloodPressure', width: 15 },
      { header: 'ชีพจร', key: 'pulse', width: 10 },
      { header: 'ที่อยู่', key: 'address', width: 30 },
      { header: 'หน่วยงาน', key: 'organization', width: 20 },
      { header: 'หน่วยงานอื่นๆ', key: 'otherOrganization', width: 20 },
      { header: 'สิทธิ', key: 'rights', width: 15 },
      { header: 'วันที่ลงทะเบียน', key: 'registrationDate', width: 18 },
      { header: 'วันที่มาตรวจ', key: 'visitDate', width: 15 }
    ];

    // Add data rows
    visits.forEach((visit, index) => {
      const patient = visit.patient;
      
      if (!patient) {
        return;
      }

      // Format birthDate properly
      let formattedBirthDate = '';
      if (patient.birthDate) {
        try {
          formattedBirthDate = new Date(patient.birthDate).toLocaleDateString('th-TH');
        } catch (error) {
          formattedBirthDate = patient.birthDate.toString();
        }
      }

      const genderValue = patient.gender || '';

      const rowData = {
        referenceNumber: visit.referenceNumber || '',
        ln: patient.ln || '',
        idCard: patient.idCard || '',
        prefix: patient.prefix || '',
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        age: patient.age || '',
        birthdate: formattedBirthDate,
        gender: genderValue,
        phone: patient.phone || '',
        weight: visit.weight || '',
        height: visit.height || '',
        bloodPressure: visit.bloodPressure || '',
        pulse: visit.pulse || '',
        address: patient.address || '',
        organization: visit.organization || '',
        otherOrganization: visit.otherOrganization || '',
        rights: visit.rights || '',
        registrationDate: patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('th-TH') : '',
        visitDate: visit.visitDate ? new Date(visit.visitDate).toLocaleDateString('th-TH') : ''
      };

      console.log(`\n📝 Adding row to Excel:`);
      console.log(`   birthdate: "${rowData.birthdate}"`);
      console.log(`   gender: "${rowData.gender}"`);

      const row = worksheet.addRow(rowData);
    });

    // Save to file
    const filename = `direct-test-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    await workbook.xlsx.writeFile(filename);
    
    console.log(`\n✅ Direct test report saved as: ${filename}`);
    console.log('📁 Check the backend folder for the generated file');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

directTestReports();
