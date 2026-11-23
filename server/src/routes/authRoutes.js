import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  signup,
  login,
  googleAuth,
  logout,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  getAddresses,
  addAddress,
  deleteAddress,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Strict rate limiter for authentication attempts (prevents brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
  },
});

// Password reset limiter
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again after an hour.',
  },
});

// Authentication endpoints
router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleAuth);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.get('/addresses', protect, getAddresses);
router.post('/addresses', protect, addAddress);
router.delete('/addresses/:addressId', protect, deleteAddress);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);

// Optional Google OAuth redirect callback endpoint
router.get('/google/callback', (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  res.redirect(`${clientUrl}/login?googleSuccess=true`);
});

export default router;
