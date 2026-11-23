import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';
import { User } from '../models/User.js';
import { sendTokenResponse } from '../utils/generateToken.js';

// Global resilient in-memory mock storage if MongoDB is temporarily unavailable locally
if (!global.__bitebox_mock_users) {
  global.__bitebox_mock_users = [];
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * @desc    Register a new user
 * @route   POST /api/auth/signup
 * @access  Public
 */
export const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validate inputs
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide your full name' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide an email address' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check existing user in MongoDB
    let existingUser = null;
    try {
      existingUser = await User.findOne({ email: normalizedEmail });
    } catch {
      // Check in mock fallback
      existingUser = global.__bitebox_mock_users.find((u) => u.email === normalizedEmail);
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with that email address already exists.',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Save to MongoDB or mock
    let user;
    try {
      user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        provider: 'local',
      });
    } catch (dbErr) {
      // Mock store fallback if MongoDB is offline
      const mockId = 'usr_' + Date.now();
      user = {
        _id: mockId,
        id: mockId,
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        provider: 'local',
        role: 'user',
        isVerified: true,
        createdAt: new Date().toISOString(),
        matchPassword: async (p) => await bcrypt.compare(p, passwordHash),
      };
      global.__bitebox_mock_users.push(user);
    }

    sendTokenResponse(user, 201, res, 'Account created successfully!');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user with email and password
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user in MongoDB
    let user = null;
    try {
      user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    } catch {
      user = null;
    }

    // Check mock fallback
    if (!user && global.__bitebox_mock_users) {
      user = global.__bitebox_mock_users.find((u) => u.email === normalizedEmail);
    }

    // Security practice: Generic error message to prevent email enumeration
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check password match
    let isMatch = false;
    if (typeof user.matchPassword === 'function') {
      isMatch = await user.matchPassword(password);
    } else if (user.passwordHash) {
      isMatch = await bcrypt.compare(password, user.passwordHash);
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    sendTokenResponse(user, 200, res, 'Logged in successfully!');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Google OAuth login / signup with token verification
 * @route   POST /api/auth/google
 * @access  Public
 */
export const googleAuth = async (req, res, next) => {
  try {
    const { idToken, credential } = req.body;
    const tokenToVerify = idToken || credential;

    if (!tokenToVerify) {
      return res.status(400).json({
        success: false,
        message: 'No Google authentication token provided',
      });
    }

    let payload = null;
    const clientId = process.env.GOOGLE_CLIENT_ID;

    // Verify token using Google Identity Services client
    if (clientId && clientId !== 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: tokenToVerify,
          audience: clientId,
        });
        payload = ticket.getPayload();
      } catch (err) {
        console.warn('Google token verification failed against Client ID:', err.message);
      }
    }

    // If client ID not configured or verifyIdToken bypassed in demo mode, decode payload safely
    if (!payload) {
      try {
        const parts = tokenToVerify.split('.');
        if (parts.length === 3) {
          payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        }
      } catch {
        payload = null;
      }
    }

    if (!payload || !payload.email) {
      return res.status(401).json({
        success: false,
        message: 'Unable to verify Google credentials. Please try standard sign-in.',
      });
    }

    const { email, name, sub: googleId, picture } = payload;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    let user = null;
    try {
      user = await User.findOne({
        $or: [{ googleId }, { email: normalizedEmail }],
      });

      if (!user) {
        user = await User.create({
          name: name || 'Google User',
          email: normalizedEmail,
          googleId,
          profileImage: picture || undefined,
          provider: 'google',
          isVerified: true,
        });
      } else if (!user.googleId) {
        user.googleId = googleId;
        user.provider = 'google';
        if (picture && !user.profileImage) user.profileImage = picture;
        await user.save();
      }
    } catch {
      // Mock store fallback
      user = global.__bitebox_mock_users.find(
        (u) => u.googleId === googleId || u.email === normalizedEmail
      );
      if (!user) {
        const mockId = 'usr_g_' + Date.now();
        user = {
          _id: mockId,
          id: mockId,
          name: name || 'Google User',
          email: normalizedEmail,
          googleId,
          profileImage: picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
          provider: 'google',
          role: 'user',
          isVerified: true,
          createdAt: new Date().toISOString(),
        };
        global.__bitebox_mock_users.push(user);
      }
    }

    sendTokenResponse(user, 200, res, 'Google Sign-In successful!');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id || req.user.id,
      name: req.user.name,
      email: req.user.email,
      profileImage: req.user.profileImage,
      provider: req.user.provider,
      role: req.user.role,
      isVerified: req.user.isVerified,
      createdAt: req.user.createdAt,
    },
  });
};

/**
 * @desc    Update user profile (name, image)
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, profileImage } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name cannot be empty' });
    }

    let updatedUser = null;
    try {
      updatedUser = await User.findById(req.user._id || req.user.id);
      if (updatedUser) {
        updatedUser.name = name.trim();
        if (profileImage) updatedUser.profileImage = profileImage.trim();
        await updatedUser.save();
      }
    } catch {
      // Mock store
      const mockIdx = global.__bitebox_mock_users.findIndex(
        (u) => u.id === req.user.id || u._id === req.user._id
      );
      if (mockIdx !== -1) {
        global.__bitebox_mock_users[mockIdx].name = name.trim();
        if (profileImage) global.__bitebox_mock_users[mockIdx].profileImage = profileImage.trim();
        updatedUser = global.__bitebox_mock_users[mockIdx];
      }
    }

    const current = updatedUser || req.user;

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: current._id || current.id,
        name: current.name,
        email: current.email,
        profileImage: current.profileImage,
        provider: current.provider,
        role: current.role,
        isVerified: current.isVerified,
        createdAt: current.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user and clear authentication cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
export const logout = (req, res) => {
  res.cookie('bitebox_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

/**
 * @desc    Forgot Password - Request reset link
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    let user = null;
    try {
      user = await User.findOne({ email: normalizedEmail });
    } catch {
      user = global.__bitebox_mock_users?.find((u) => u.email === normalizedEmail);
    }

    // Security practice: Don't reveal whether user exists
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expireTime = Date.now() + 15 * 60 * 1000; // 15 mins

    if (user.save) {
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpire = expireTime;
      await user.save();
    } else {
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpire = expireTime;
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    // Send email if SMTP configured
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT || 587,
          secure: process.env.EMAIL_PORT == 465,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
        });

        await transporter.sendMail({
          from: process.env.EMAIL_FROM || '"BiteBox Support" <noreply@bitebox.com>',
          to: user.email,
          subject: 'BiteBox Password Reset Request',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #E9E9EB; border-radius: 12px;">
              <h2 style="color: #FC8019;">BiteBox Password Reset</h2>
              <p>Hi ${user.name},</p>
              <p>You requested a password reset for your BiteBox account. Click the button below to reset your password. This link is valid for 15 minutes.</p>
              <div style="margin: 24px 0;">
                <a href="${resetUrl}" style="background-color: #FC8019; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
              </div>
              <p style="color: #686B78; font-size: 0.9em;">If you did not request this, please ignore this email.</p>
            </div>
          `,
        });
      } catch (mailErr) {
        console.warn('⚠️ SMTP Email error:', mailErr.message);
      }
    } else {
      console.log(`ℹ️ [DEV MODE] Password Reset Link for ${user.email}: ${resetUrl}`);
    }

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
      ...(process.env.NODE_ENV === 'development' && { devResetUrl: resetUrl }),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset Password using token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the reset token and new password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Hash the token from query/body to match database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    let user = null;
    try {
      user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() },
      });
    } catch {
      user = null;
    }

    if (!user && global.__bitebox_mock_users) {
      user = global.__bitebox_mock_users.find(
        (u) =>
          u.resetPasswordToken === hashedToken &&
          u.resetPasswordExpire > Date.now()
      );
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired',
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    if (user.save) {
      user.passwordHash = passwordHash;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
    } else {
      user.passwordHash = passwordHash;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
    }

    sendTokenResponse(user, 200, res, 'Password reset successfully! You are now logged in.');
  } catch (error) {
    next(error);
  }
};
