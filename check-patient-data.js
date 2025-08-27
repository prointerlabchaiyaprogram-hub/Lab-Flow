const mongoose = require('mongoose');
const Patient = require('./models/Patient');
const Visit = require('./models/Visit');
require('dotenv').config();

async function checkPatientData() {
  try {
    console.log('🔍 Checking patient data for birthDate and gender...\n');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');
    
    // Get all patients with visits
    const visits = await Visit.find({}).populate('patient').exec();
    console.log(`\n👥 Found ${visits.length} visits:`);
    
    if (visits.length === 0) {
      console.log('❌ No visits found!');
      return;
    }
    
    visits.forEach((visit, index) => {
      const patient = visit.patient;
      console.log(`\n📋 Visit ${index + 1}:`);
      console.log(`   Reference: ${visit.referenceNumber || 'N/A'}`);
      
      if (patient) {
        console.log(`   Patient Name: ${patient.prefix || ''} ${patient.firstName || ''} ${patient.lastName || ''}`);
        console.log(`   Age: ${patient.age || 'N/A'}`);
        console.log(`   Gender: "${patient.gender}" (type: ${typeof patient.gender})`);
        console.log(`   BirthDate: "${patient.birthDate}" (type: ${typeof patient.birthDate})`);
        console.log(`   Phone: ${patient.phone || 'N/A'}`);
        console.log(`   ID Card: ${patient.idCard || 'N/A'}`);
        
        // Check if birthDate exists and format it
        if (patient.birthDate) {
          const formattedDate = new Date(patient.birthDate).toLocaleDateString('th-TH');
          console.log(`   Formatted BirthDate: ${formattedDate}`);
        } else {
          console.log(`   ❌ No birthDate found`);
        }
        
        // Check gender value
        if (patient.gender) {
          console.log(`   ✅ Gender exists: "${patient.gender}"`);
        } else {
          console.log(`   ❌ No gender found`);
        }
      } else {
        console.log(`   ❌ No patient data for this visit`);
      }
    });
    
    // Summary
    const patientsWithBirthDate = visits.filter(v => v.patient?.birthDate).length;
    const patientsWithGender = visits.filter(v => v.patient?.gender).length;
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total visits: ${visits.length}`);
    console.log(`   Visits with birthDate: ${patientsWithBirthDate}`);
    console.log(`   Visits with gender: ${patientsWithGender}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkPatientData();
