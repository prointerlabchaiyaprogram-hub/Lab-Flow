const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Payment = require('../models/Payment');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Middleware to ensure only admin can access these routes
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Get dashboard statistics
router.get('/dashboard-stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeSubscriptions = await User.countDocuments({ subscriptionStatus: 'active' });
    const expiredSubscriptions = await User.countDocuments({ subscriptionStatus: 'expired' });
    const pendingSubscriptions = await User.countDocuments({ subscriptionStatus: 'pending' });
    
    const totalRevenue = await Payment.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          paymentDate: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Users expiring in next 7 days
    const expiringUsers = await User.findExpiringSubscriptions(7);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeSubscriptions,
        expiredSubscriptions,
        pendingSubscriptions,
        totalRevenue: totalRevenue[0]?.total || 0,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        expiringUsersCount: expiringUsers.length
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard stats'
    });
  }
});

// Get all users with pagination and filters
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const filters = {};
    if (req.query.status) filters.subscriptionStatus = req.query.status;
    if (req.query.role) filters.role = req.query.role;
    if (req.query.search) {
      filters.$or = [
        { username: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { fullName: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const users = await User.find(filters)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalUsers = await User.countDocuments(filters);
    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
});

// Get single user details
router.get('/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's payment history
    const payments = await Payment.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        user,
        payments
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user'
    });
  }
});

// Update user subscription
router.put('/users/:userId/subscription', async (req, res) => {
  try {
    const { subscriptionStatus, subscriptionPlan, months } = req.body;
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (subscriptionStatus) {
      user.subscriptionStatus = subscriptionStatus;
    }

    if (subscriptionPlan) {
      user.subscriptionPlan = subscriptionPlan;
    }

    if (months && months > 0) {
      await user.extendSubscription(months, subscriptionPlan || user.subscriptionPlan);
    }

    await user.save();

    res.json({
      success: true,
      message: 'User subscription updated successfully',
      data: { user: await User.findById(user._id).select('-password') }
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating subscription'
    });
  }
});

// Update user details
router.put('/users/:userId', async (req, res) => {
  try {
    const { fullName, email, role, isActive } = req.body;
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (fullName) user.fullName = fullName;
    if (email) user.email = email;
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: await User.findById(user._id).select('-password') }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user'
    });
  }
});

// Delete user
router.delete('/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user's payments
    await Payment.deleteMany({ user: user._id });
    
    // Delete user
    await User.findByIdAndDelete(user._id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting user'
    });
  }
});

// Get all payments with pagination
router.get('/payments', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const filters = {};
    if (req.query.status) filters.paymentStatus = req.query.status;
    if (req.query.plan) filters.subscriptionPlan = req.query.plan;

    const payments = await Payment.find(filters)
      .populate('user', 'username email fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPayments = await Payment.countDocuments(filters);
    const totalPages = Math.ceil(totalPayments / limit);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: page,
          totalPages,
          totalPayments,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching payments'
    });
  }
});

// Manually confirm payment
router.put('/payments/:paymentId/confirm', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.paymentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment already confirmed'
      });
    }

    await payment.markCompleted({
      adminConfirmed: true,
      confirmedBy: req.user._id,
      confirmedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: { payment }
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error confirming payment'
    });
  }
});

// Get revenue reports
router.get('/reports/revenue', async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    let groupBy, dateFormat;

    switch (period) {
      case 'daily':
        groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$paymentDate" } };
        dateFormat = 'daily';
        break;
      case 'weekly':
        groupBy = { $dateToString: { format: "%Y-%U", date: "$paymentDate" } };
        dateFormat = 'weekly';
        break;
      case 'yearly':
        groupBy = { $dateToString: { format: "%Y", date: "$paymentDate" } };
        dateFormat = 'yearly';
        break;
      default: // monthly
        groupBy = { $dateToString: { format: "%Y-%m", date: "$paymentDate" } };
        dateFormat = 'monthly';
    }

    const revenueData = await Payment.aggregate([
      { $match: { paymentStatus: 'completed', paymentDate: { $exists: true } } },
      {
        $group: {
          _id: groupBy,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          plans: {
            $push: {
              plan: '$subscriptionPlan',
              amount: '$amount'
            }
          }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 12 } // Last 12 periods
    ]);

    res.json({
      success: true,
      data: {
        period: dateFormat,
        revenueData
      }
    });
  } catch (error) {
    console.error('Revenue report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating revenue report'
    });
  }
});

// Get users expiring soon
router.get('/users/expiring/:days', async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 7;
    const expiringUsers = await User.findExpiringSubscriptions(days);

    res.json({
      success: true,
      data: { expiringUsers }
    });
  } catch (error) {
    console.error('Expiring users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching expiring users'
    });
  }
});

// Get pending approval memberships
router.get('/pending-approvals', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get users pending approval
    const pendingUsers = await User.find({ 
      approvalStatus: 'pending',
      subscriptionStatus: 'pending_approval'
    })
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    // Get payments pending approval
    const pendingPayments = await Payment.findPendingApproval()
      .sort({ createdAt: -1 });

    const totalPending = await User.countDocuments({ 
      approvalStatus: 'pending',
      subscriptionStatus: 'pending_approval'
    });
    const totalPages = Math.ceil(totalPending / limit);

    res.json({
      success: true,
      data: {
        pendingUsers,
        pendingPayments,
        pagination: {
          currentPage: page,
          totalPages,
          totalPending,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Pending approvals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching pending approvals'
    });
  }
});

// Approve membership
router.put('/approve-membership/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { subscriptionEndDate, subscriptionPlan, months } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find the pending payment
    const payment = await Payment.findOne({
      user: userId,
      approvalStatus: 'pending',
      paymentStatus: 'pending_approval'
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'No pending payment found for this user'
      });
    }

    // Calculate end date
    let endDate;
    if (subscriptionEndDate) {
      endDate = new Date(subscriptionEndDate);
    } else if (months) {
      endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);
    } else {
      endDate = new Date();
      endDate.setMonth(endDate.getMonth() + payment.subscriptionDuration);
    }

    // Update payment plan if provided
    if (subscriptionPlan) {
      payment.subscriptionPlan = subscriptionPlan;
      user.subscriptionPlan = subscriptionPlan;
    }

    // Approve the payment
    await payment.approveByAdmin(req.user._id, endDate);

    res.json({
      success: true,
      message: 'Membership approved successfully',
      data: {
        user: await User.findById(userId).select('-password'),
        payment
      }
    });
  } catch (error) {
    console.error('Approve membership error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error approving membership'
    });
  }
});

// Reject membership
router.put('/reject-membership/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find the pending payment
    const payment = await Payment.findOne({
      user: userId,
      approvalStatus: 'pending',
      paymentStatus: 'pending_approval'
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'No pending payment found for this user'
      });
    }

    // Reject the payment
    await payment.rejectByAdmin(req.user._id, reason);

    res.json({
      success: true,
      message: 'Membership rejected successfully',
      data: {
        user: await User.findById(userId).select('-password'),
        payment
      }
    });
  } catch (error) {
    console.error('Reject membership error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error rejecting membership'
    });
  }
});

// Update payment information
router.put('/update-payment-info/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { paymentMethod, paymentReference, paymentProof, notes } = req.body;
    
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update payment information
    if (paymentMethod) payment.paymentMethod = paymentMethod;
    if (paymentReference) payment.paymentReference = paymentReference;
    if (paymentProof) payment.paymentProof = paymentProof;
    if (notes) payment.notes = notes;

    await payment.save();

    res.json({
      success: true,
      message: 'Payment information updated successfully',
      data: { payment }
    });
  } catch (error) {
    console.error('Update payment info error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating payment information'
    });
  }
});

module.exports = router;
