import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Please provide a coupon code'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a coupon description'],
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat', 'free_delivery'],
      required: [true, 'Discount type must be percentage, flat, or free_delivery'],
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      required: [true, 'Please provide discount value'],
      min: [0, 'Discount value cannot be negative'],
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: [0, 'Minimum order value cannot be negative'],
    },
    maxDiscount: {
      type: Number,
      default: null, // Cap for percentage discounts (null means no cap)
    },
    expiryDate: {
      type: Date,
      required: [true, 'Please provide an expiry date'],
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    usageLimit: {
      type: Number,
      default: null, // Total global usage limit (null = unlimited)
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    perUserLimit: {
      type: Number,
      default: 1, // Max times a single user can use this coupon
    },
    usedByUsers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        usedCount: {
          type: Number,
          default: 1,
        },
        lastUsedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    firstOrderOnly: {
      type: Boolean,
      default: false,
    },
    applicableRestaurants: [
      {
        type: String,
      },
    ],
    applicableCategories: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Method to check if coupon is valid for a given order value and user
couponSchema.methods.isValidFor = function (orderValue, userOrderCount = 0, userId = null) {
  const now = new Date();

  // 1. Check active status
  if (!this.isActive) {
    return { valid: false, message: `Coupon '${this.code}' is currently inactive.` };
  }

  // 2. Check expiry date
  if (this.expiryDate && new Date(this.expiryDate) < now) {
    return { valid: false, message: `Coupon '${this.code}' has expired.` };
  }

  // 3. Check overall usage limit
  if (this.usageLimit !== null && this.usedCount >= this.usageLimit) {
    return { valid: false, message: `Coupon '${this.code}' usage limit has been reached.` };
  }

  // 4. Check minimum order value
  if (orderValue < this.minOrderValue) {
    return {
      valid: false,
      message: `Minimum order value for '${this.code}' is ₹${this.minOrderValue}. Add items worth ₹${Math.ceil(this.minOrderValue - orderValue)} more.`,
    };
  }

  // 5. Check first order only
  if (this.firstOrderOnly && userOrderCount > 0) {
    return { valid: false, message: `Coupon '${this.code}' is only valid on your first order.` };
  }

  // 6. Check per-user limit
  if (userId && this.usedByUsers && this.usedByUsers.length > 0) {
    const userRecord = this.usedByUsers.find(
      (u) => u.userId && u.userId.toString() === userId.toString()
    );
    if (userRecord && userRecord.usedCount >= this.perUserLimit) {
      return {
        valid: false,
        message: `You have already used coupon '${this.code}' the maximum allowed number of times (${this.perUserLimit}).`,
      };
    }
  }

  return { valid: true };
};

// Initial Sample Coupons configuration
export const INITIAL_SAMPLE_COUPONS = [
  {
    code: 'WELCOME10',
    description: 'Get 10% OFF up to ₹100 on your first order!',
    discountType: 'percentage',
    discountValue: 10,
    minOrderValue: 199,
    maxDiscount: 100,
    firstOrderOnly: true,
    perUserLimit: 1,
    isActive: true,
    expiryDate: new Date('2027-12-31'),
  },
  {
    code: 'BITEBOX20',
    description: 'Special 20% discount up to ₹200 on gourmet meals.',
    discountType: 'percentage',
    discountValue: 20,
    minOrderValue: 499,
    maxDiscount: 200,
    firstOrderOnly: false,
    perUserLimit: 3,
    isActive: true,
    expiryDate: new Date('2027-12-31'),
  },
  {
    code: 'FLAT50',
    description: 'Flat ₹50 savings on any craving above ₹199!',
    discountType: 'flat',
    discountValue: 50,
    minOrderValue: 199,
    maxDiscount: 50,
    firstOrderOnly: false,
    perUserLimit: 5,
    isActive: true,
    expiryDate: new Date('2027-12-31'),
  },
  {
    code: 'FREESHIP',
    description: 'Free doorstep express delivery on orders above ₹299.',
    discountType: 'free_delivery',
    discountValue: 0,
    minOrderValue: 299,
    maxDiscount: null,
    firstOrderOnly: false,
    perUserLimit: 5,
    isActive: true,
    expiryDate: new Date('2027-12-31'),
  },
  {
    code: 'STUDENT15',
    description: 'Student special! Enjoy 15% OFF up to ₹150.',
    discountType: 'percentage',
    discountValue: 15,
    minOrderValue: 299,
    maxDiscount: 150,
    firstOrderOnly: false,
    perUserLimit: 4,
    isActive: true,
    expiryDate: new Date('2027-12-31'),
  },
];

export const Coupon = mongoose.model('Coupon', couponSchema);
