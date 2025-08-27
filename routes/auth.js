const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Payment = require('../models/Payment');
const { generateToken, authenticateToken, requireActiveSubscription, loginRateLimit } = require('../middleware/auth');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, fullName, role = 'user', subscriptionPlan = 'basic' } = req.body;

    // Validation
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Create new user with pending approval status
    const user = new User({
      username,
      email,
      password,
      fullName,
      role,
      subscriptionStatus: 'pending_approval',
      subscriptionPlan,
      approvalStatus: 'pending'
    });

    await user.save();

    // Create payment record for admin approval
    const amount = Payment.calculatePrice(subscriptionPlan, 1); // Default 1 month
    const payment = new Payment({
      user: user._id,
      amount,
      paymentMethod: 'bank_transfer', // Default method
      subscriptionPlan,
      subscriptionDuration: 1,
      paymentStatus: 'pending_approval',
      approvalStatus: 'pending'
    });

    await payment.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please proceed to payment.',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionPlan: user.subscriptionPlan,
          approvalStatus: user.approvalStatus
        },
        payment: {
          id: payment._id,
          amount: payment.amount,
          currency: payment.currency,
          plan: payment.subscriptionPlan,
          duration: payment.subscriptionDuration
        },
        token,
        redirectTo: '/payment-instructions'
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Login attempt:', email);

    if (!email || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ email });
    console.log('👤 User found:', user ? 'YES' : 'NO');
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('🔍 User details:', {
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });

    // Check password
    console.log('🔑 Testing password comparison...');
    const isPasswordValid = await user.comparePassword(password);
    console.log('🔑 Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      // Increment login attempts
      user.loginAttempts += 1;
      
      // Lock account after 5 failed attempts for 30 minutes
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }
      
      await user.save();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionEndDate: user.subscriptionEndDate,
          daysRemaining: user.daysRemaining,
          canAccess: user.canAccess()
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionPlan: user.subscriptionPlan,
          subscriptionStartDate: user.subscriptionStartDate,
          subscriptionEndDate: user.subscriptionEndDate,
          daysRemaining: user.daysRemaining,
          canAccess: user.canAccess(),
          totalPaid: user.totalPaid,
          lastPaymentDate: user.lastPaymentDate
        }
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Create payment for subscription
router.post('/create-payment', authenticateToken, async (req, res) => {
  try {
    const { plan, duration, paymentMethod } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!plan || !duration || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Plan, duration, and payment method are required'
      });
    }

    // Calculate price
    const amount = Payment.calculatePrice(plan, duration);

    // Create payment record
    const payment = new Payment({
      user: userId,
      amount,
      paymentMethod,
      subscriptionPlan: plan,
      subscriptionDuration: duration,
      paymentStatus: 'pending'
    });

    await payment.save();

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: {
        payment: {
          id: payment._id,
          amount: payment.amount,
          currency: payment.currency,
          plan: payment.subscriptionPlan,
          duration: payment.subscriptionDuration,
          paymentMethod: payment.paymentMethod,
          status: payment.paymentStatus,
          dueDate: payment.dueDate
        }
      }
    });

  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating payment'
    });
  }
});

// Confirm payment (simulate payment gateway callback)
router.post('/confirm-payment/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { transactionId, gatewayResponse } = req.body;

    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Mark payment as completed
    await payment.markCompleted({ transactionId, ...gatewayResponse });

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: {
        payment: {
          id: payment._id,
          status: payment.paymentStatus,
          receiptNumber: payment.receiptNumber,
          transactionId: payment.transactionId
        }
      }
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error confirming payment'
    });
  }
});

// Get payment history
router.get('/payments', authenticateToken, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: { payments }
    });

  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching payments'
    });
  }
});

// Get subscription plans and pricing
router.get('/plans', async (req, res) => {
  try {
    const plans = Payment.getPaymentPlans();
    
    res.json({
      success: true,
      data: { plans }
    });
  } catch (error) {
    console.error('Plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching plans'
    });
  }
});

// Check subscription status
router.get('/subscription-status', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      data: {
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionEndDate: user.subscriptionEndDate,
        daysRemaining: user.daysRemaining,
        isExpired: user.isSubscriptionExpired,
        canAccess: user.canAccess()
      }
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking subscription'
    });
  }
});

module.exports = router;
