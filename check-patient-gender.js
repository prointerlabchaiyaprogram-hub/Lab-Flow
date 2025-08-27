const mongoose = require('mongoose');
const Patient = require('./models/Patient');
require('dotenv').config();

async function checkPatientGender() {
  try {
    console.log('🔍 Checking patient gender data in labflow database...\n');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas (labflow)');
    
    // Get all patients
    const patients = await Patient.find({});
    console.log(`\n👥 Found ${patients.length} patients in labflow database:`);
    
    if (patients.length === 0) {
      console.log('❌ No patients found in labflow database!');
      return;
    }
    
    patients.forEach((patient, index) => {
      console.log(`\n📋 Patient ${index + 1}:`);
      console.log(`   Name: ${patient.prefix || ''} ${patient.firstName || ''} ${patient.lastName || ''}`);
      console.log(`   Age: ${patient.age || 'N/A'}`);
      console.log(`   Gender: "${patient.gender}" (type: ${typeof patient.gender})`);
      console.log(`   Phone: ${patient.phone || 'N/A'}`);
      console.log(`   ID Card: ${patient.idCard || 'N/A'}`);
    });
    
    // Check gender values
    const genderValues = patients.map(p => p.gender).filter(g => g);
    const uniqueGenders = [...new Set(genderValues)];
    
    console.log(`\n📊 Gender analysis:`);
    console.log(`   Total patients with gender data: ${genderValues.length}`);
    console.log(`   Unique gender values: ${JSON.stringify(uniqueGenders)}`);
    
    uniqueGenders.forEach(gender => {
      const count = genderValues.filter(g => g === gender).length;
      console.log(`   - "${gender}": ${count} patients`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkPatientGender();
