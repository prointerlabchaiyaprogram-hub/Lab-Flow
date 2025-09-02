// Script to update specific patient LN from L68090002 to 68090002
const mongoose = require('mongoose');
const Patient = require('../models/Patient');

// MongoDB connection string
const MONGODB_URI = 'mongodb+srv://prointerlabchaiyaprogram:ProinterlabChaiyaProgram@cluster0.ezoru6p.mongodb.net/labflow?retryWrites=true&w=majority&appName=Cluster0';

async function updateSpecificPatient() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find patient with LN = L68090002
    const patient = await Patient.findOne({
      ln: 'L68090002'
    });

    if (patient) {
      console.log('Found patient:', patient.firstName, patient.lastName);
      console.log('Current LN:', patient.ln);
      
      // Update LN to remove 'L'
      const updatedPatient = await Patient.findByIdAndUpdate(
        patient._id,
        { ln: '68090002' },
        { new: true }
      );
      
      console.log('Updated LN:', updatedPatient.ln);
      console.log('Patient updated successfully');
    } else {
      console.log('Patient with LN L68090002 not found');
    }
    
  } catch (error) {
    console.error('Error updating patient:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the update
updateSpecificPatient();
