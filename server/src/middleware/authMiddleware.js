import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

// Protect routes middleware
export const protect = async (req, res, next) => {
  let token;

  // Check token in HttpOnly cookie first, then Bearer authorization header
  if (req.cookies && req.cookies.bitebox_token) {
    token = req.cookies.bitebox_token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Please log in.',
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'bitebox_default_secure_jwt_secret_key_2026';
    const decoded = jwt.verify(token, secret);

    // Try finding user in MongoDB
    try {
      req.user = await User.findById(decoded.id).select('-passwordHash');
    } catch {
      req.user = null;
    }

    // Fallback if in-memory user
    if (!req.user && global.__bitebox_mock_users) {
      req.user = global.__bitebox_mock_users.find(
        (u) => u.id === decoded.id || u._id === decoded.id
      );
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this session no longer exists.',
      });
    }

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Session invalid or expired. Please sign in again.',
    });
  }
};

// Role authorization middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role}' is not authorized to access this route.`,
      });
    }
    next();
  };
};

// Optional auth middleware (populates req.user if token is present, but doesn't block guests)
export const optionalAuth = async (req, res, next) => {
  let token;
  if (req.cookies && req.cookies.bitebox_token) {
    token = req.cookies.bitebox_token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET || 'bitebox_default_secure_jwt_secret_key_2026';
    const decoded = jwt.verify(token, secret);

    try {
      req.user = await User.findById(decoded.id).select('-passwordHash');
    } catch {
      req.user = null;
    }

    if (!req.user && global.__bitebox_mock_users) {
      req.user = global.__bitebox_mock_users.find(
        (u) => u.id === decoded.id || u._id === decoded.id
      );
    }
  } catch {
    req.user = null;
  }

  next();
};
