import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      maxLength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    passwordHash: {
      type: String,
      select: false, // Never return passwordHash in standard queries
    },
    googleId: {
      type: String,
      sparse: true,
      index: true,
    },
    profileImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    },
    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      select: false,
    },
    addresses: [
      {
        fullName: { type: String, required: true },
        recipientName: { type: String },
        phone: { type: String, required: true },
        tag: { type: String, enum: ['Home', 'Work', 'College', 'Other'], default: 'Home' },
        label: { type: String, default: 'Home' },
        addressLine: { type: String, required: true },
        address: { type: String },
        fullAddress: { type: String },
        houseNumber: { type: String, default: '' },
        apartment: { type: String, default: '' },
        landmark: { type: String, default: '' },
        area: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, default: 'Maharashtra' },
        pincode: { type: String, required: true },
        placeId: { type: String, default: '' },
        coordinates: {
          lat: { type: Number },
          lng: { type: Number },
        },
        isDefault: { type: Boolean, default: false },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Method to verify password match
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Method to generate and hash password reset token
userSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire to 15 minutes from now
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

export const User = mongoose.model('User', userSchema);
