const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  files: [{
    fileName: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    size: {
      type: Number
    },
    mimetype: {
      type: String
    }
  }],
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'completed'
  },
  createdBy: {
    type: String,
    default: 'medical-tech'
  }
}, {
  timestamps: true
});

// Populate order with visit and patient data
testResultSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'order',
    populate: {
      path: 'visit',
      populate: {
        path: 'patient'
      }
    }
  });
  next();
});

module.exports = mongoose.model('TestResult', testResultSchema);
