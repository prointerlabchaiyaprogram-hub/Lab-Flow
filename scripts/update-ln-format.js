// Script to update existing LN format from L68090001 to 68090001
const mongoose = require('mongoose');
const Patient = require('../models/Patient');

// MongoDB connection string - update this to match your database
const MONGODB_URI = 'mongodb+srv://prointerlabchaiyaprogram:ProinterlabChaiyaProgram@cluster0.ezoru6p.mongodb.net/labflow?retryWrites=true&w=majority&appName=Cluster0';

async function updateLnFormat() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all patients with LN starting with 'L'
    const patientsWithL = await Patient.find({
      ln: { $regex: '^L' }
    });

    console.log(`Found ${patientsWithL.length} patients with LN starting with 'L'`);

    let updatedCount = 0;

    for (const patient of patientsWithL) {
      const oldLn = patient.ln;
      const newLn = oldLn.substring(1); // Remove the first character 'L'
      
      await Patient.findByIdAndUpdate(patient._id, { ln: newLn });
      console.log(`Updated: ${oldLn} -> ${newLn}`);
      updatedCount++;
    }

    console.log(`Successfully updated ${updatedCount} patient records`);
    
  } catch (error) {
    console.error('Error updating LN format:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the update
updateLnFormat();
