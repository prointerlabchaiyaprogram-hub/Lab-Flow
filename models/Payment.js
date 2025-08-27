const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'THB',
    enum: ['THB', 'USD', 'EUR']
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['credit_card', 'bank_transfer', 'promptpay', 'cash', 'other']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded', 'pending_approval'],
    default: 'pending_approval'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true // Allow null values but ensure uniqueness when present
  },
  // Subscription details
  subscriptionPlan: {
    type: String,
    enum: ['basic', 'premium', 'enterprise'],
    required: true
  },
  subscriptionDuration: {
    type: Number, // in months
    required: true,
    min: 1,
    max: 36
  },
  // Payment gateway details
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Receipt and invoice
  receiptNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  invoiceUrl: {
    type: String,
    default: null
  },
  // Dates
  paymentDate: {
    type: Date,
    default: null
  },
  dueDate: {
    type: Date,
    default: function() {
      const now = new Date();
      now.setDate(now.getDate() + 7); // 7 days to pay
      return now;
    }
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
  // Payment proof/evidence
  paymentProof: {
    type: String, // File path or URL
    default: null
  },
  paymentReference: {
    type: String,
    default: null
  },
  // Metadata
  notes: {
    type: String,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware
paymentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Generate transaction ID if not provided
  if (!this.transactionId && this.paymentStatus === 'completed') {
    this.transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Generate receipt number for completed payments
  if (!this.receiptNumber && this.paymentStatus === 'completed') {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.receiptNumber = `RCP${year}${month}${day}${random}`;
  }
  
  next();
});

// Method to approve payment by admin
paymentSchema.methods.approveByAdmin = async function(adminId, subscriptionEndDate = null) {
  this.approvalStatus = 'approved';
  this.approvedBy = adminId;
  this.approvedAt = new Date();
  this.paymentStatus = 'completed';
  this.paymentDate = new Date();
  
  // Update user subscription
  const User = mongoose.model('User');
  const user = await User.findById(this.user);
  if (user) {
    user.subscriptionStatus = 'active';
    user.subscriptionStartDate = new Date();
    user.subscriptionEndDate = subscriptionEndDate || new Date(Date.now() + (this.subscriptionDuration * 30 * 24 * 60 * 60 * 1000));
    user.subscriptionPlan = this.subscriptionPlan;
    user.approvalStatus = 'approved';
    user.approvedBy = adminId;
    user.approvedAt = new Date();
    user.totalPaid += this.amount;
    user.lastPaymentDate = new Date();
    await user.save();
  }
  
  return this.save();
};

// Method to reject payment by admin
paymentSchema.methods.rejectByAdmin = async function(adminId, reason) {
  this.approvalStatus = 'rejected';
  this.approvedBy = adminId;
  this.approvedAt = new Date();
  this.rejectionReason = reason;
  this.paymentStatus = 'failed';
  
  // Update user status
  const User = mongoose.model('User');
  const user = await User.findById(this.user);
  if (user) {
    user.approvalStatus = 'rejected';
    user.rejectionReason = reason;
    user.approvedBy = adminId;
    user.approvedAt = new Date();
    await user.save();
  }
  
  return this.save();
};

// Method to mark payment as completed (legacy)
paymentSchema.methods.markCompleted = async function(transactionDetails = {}) {
  this.paymentStatus = 'completed';
  this.paymentDate = new Date();
  this.gatewayResponse = { ...this.gatewayResponse, ...transactionDetails };
  
  // Update user subscription
  const User = mongoose.model('User');
  const user = await User.findById(this.user);
  if (user) {
    await user.extendSubscription(this.subscriptionDuration, this.subscriptionPlan);
    user.totalPaid += this.amount;
    await user.save();
  }
  
  return this.save();
};

// Method to mark payment as failed
paymentSchema.methods.markFailed = function(reason = '') {
  this.paymentStatus = 'failed';
  this.notes = reason;
  return this.save();
};

// Static method to get payment plans
paymentSchema.statics.getPaymentPlans = function() {
  return {
    basic: {
      monthly: 299,
      quarterly: 799, // 3 months
      yearly: 2999    // 12 months
    },
    premium: {
      monthly: 599,
      quarterly: 1599,
      yearly: 5999
    },
    enterprise: {
      monthly: 999,
      quarterly: 2699,
      yearly: 9999
    }
  };
};

// Static method to calculate price
paymentSchema.statics.calculatePrice = function(plan, duration) {
  const plans = this.getPaymentPlans();
  const planPrices = plans[plan];
  
  if (!planPrices) throw new Error('Invalid plan');
  
  if (duration === 1) return planPrices.monthly;
  if (duration === 3) return planPrices.quarterly;
  if (duration === 12) return planPrices.yearly;
  
  // For other durations, calculate based on monthly price with discount
  const monthlyPrice = planPrices.monthly;
  let totalPrice = monthlyPrice * duration;
  
  // Apply discounts for longer periods
  if (duration >= 6) totalPrice *= 0.9;  // 10% discount for 6+ months
  if (duration >= 12) totalPrice *= 0.85; // 15% discount for 12+ months
  
  return Math.round(totalPrice);
};

// Static method to find pending payments
paymentSchema.statics.findPendingPayments = function(daysOverdue = 0) {
  const query = { paymentStatus: 'pending' };
  
  if (daysOverdue > 0) {
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - daysOverdue);
    query.dueDate = { $lt: overdueDate };
  }
  
  return this.find(query).populate('user', 'username email fullName');
};

// Static method to find payments pending approval
paymentSchema.statics.findPendingApproval = function() {
  return this.find({ 
    paymentStatus: 'pending_approval',
    approvalStatus: 'pending'
  }).populate('user', 'username email fullName subscriptionPlan');
};

// Indexes for performance
paymentSchema.index({ user: 1 });
paymentSchema.index({ paymentStatus: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ dueDate: 1 });
paymentSchema.index({ transactionId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
