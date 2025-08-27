const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'medical_tech', 'doctor', 'user'],
    default: 'user'
  },
  // Subscription fields
  subscriptionStatus: {
    type: String,
    enum: ['active', 'expired', 'pending', 'cancelled', 'pending_approval'],
    default: 'pending_approval'
  },
  subscriptionStartDate: {
    type: Date,
    default: null
  },
  subscriptionEndDate: {
    type: Date,
    default: null
  },
  subscriptionPlan: {
    type: String,
    enum: ['basic', 'premium', 'enterprise'],
    default: 'basic'
  },
  // Payment tracking
  lastPaymentDate: {
    type: Date,
    default: null
  },
  totalPaid: {
    type: Number,
    default: 0
  },
  // Admin approval fields
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  // Payment information for admin review
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cash', 'credit_card'],
    default: null
  },
  paymentAmount: {
    type: Number,
    default: null
  },
  paymentReference: {
    type: String,
    default: null
  },
  paymentDate: {
    type: Date,
    default: null
  },
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for checking if subscription is expired
userSchema.virtual('isSubscriptionExpired').get(function() {
  if (!this.subscriptionEndDate) return true;
  return new Date() > this.subscriptionEndDate;
});

// Virtual for days remaining
userSchema.virtual('daysRemaining').get(function() {
  if (!this.subscriptionEndDate) return 0;
  const now = new Date();
  const endDate = new Date(this.subscriptionEndDate);
  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Update the updatedAt field
  this.updatedAt = new Date();
  
  // Only hash password if it's modified
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to extend subscription
userSchema.methods.extendSubscription = function(months = 1, plan = 'basic') {
  const now = new Date();
  
  // If subscription is expired or doesn't exist, start from now
  if (!this.subscriptionEndDate || this.isSubscriptionExpired) {
    this.subscriptionStartDate = now;
    this.subscriptionEndDate = new Date(now.getFullYear(), now.getMonth() + months, now.getDate());
  } else {
    // Extend from current end date
    const currentEnd = new Date(this.subscriptionEndDate);
    this.subscriptionEndDate = new Date(currentEnd.getFullYear(), currentEnd.getMonth() + months, currentEnd.getDate());
  }
  
  this.subscriptionStatus = 'active';
  this.subscriptionPlan = plan;
  this.lastPaymentDate = now;
  
  return this.save();
};

// Method to check if user can access system
userSchema.methods.canAccess = function() {
  return this.isActive && 
         this.subscriptionStatus === 'active' && 
         !this.isSubscriptionExpired;
};

// Static method to find users with expiring subscriptions
userSchema.statics.findExpiringSubscriptions = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    subscriptionStatus: 'active',
    subscriptionEndDate: {
      $lte: futureDate,
      $gte: new Date()
    }
  });
};

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ subscriptionEndDate: 1 });
userSchema.index({ subscriptionStatus: 1 });

module.exports = mongoose.model('User', userSchema);
