const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token - user not found' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

// Check if user has active subscription
const requireActiveSubscription = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Check if user can access the system
    if (!user.canAccess()) {
      const reason = !user.isActive ? 'Account is disabled' :
                    user.subscriptionStatus !== 'active' ? 'No active subscription' :
                    user.isSubscriptionExpired ? 'Subscription expired' : 'Access denied';
      
      return res.status(403).json({ 
        success: false, 
        message: reason,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndDate: user.subscriptionEndDate,
        daysRemaining: user.daysRemaining
      });
    }

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during subscription check' 
    });
  }
};

// Check user role
const requireRole = (roles) => {
  return (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const userRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!userRoles.includes(user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Optional authentication (for public endpoints that can benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

// Rate limiting for login attempts
const loginRateLimit = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    const user = await User.findOne({ email });
    
    if (user && user.lockUntil && user.lockUntil > Date.now()) {
      const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      return res.status(423).json({ 
        success: false, 
        message: `Account locked. Try again in ${lockTimeRemaining} minutes.` 
      });
    }

    next();
  } catch (error) {
    console.error('Login rate limit error:', error);
    next();
  }
};

// Subscription warning middleware (warns about expiring subscription)
const subscriptionWarning = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (user && user.subscriptionStatus === 'active' && user.daysRemaining <= 7) {
      res.locals.subscriptionWarning = {
        daysRemaining: user.daysRemaining,
        message: `Your subscription expires in ${user.daysRemaining} days`
      };
    }

    next();
  } catch (error) {
    console.error('Subscription warning error:', error);
    next();
  }
};

module.exports = {
  generateToken,
  authenticateToken,
  requireActiveSubscription,
  requireRole,
  optionalAuth,
  loginRateLimit,
  subscriptionWarning,
  JWT_SECRET
};
