import mongoose from 'mongoose';
import { Coupon, INITIAL_SAMPLE_COUPONS } from '../models/Coupon.js';
import { Order } from '../models/Order.js';
import { calculateOrderPricing } from '../utils/pricingCalculator.js';

// In-memory fallback coupons store for resilient offline dev support
let fallbackCoupons = JSON.parse(JSON.stringify(INITIAL_SAMPLE_COUPONS)).map((c, i) => ({
  ...c,
  _id: `mock-coupon-${i + 1}`,
  usedCount: 0,
  usedByUsers: [],
  createdAt: new Date(),
  updatedAt: new Date(),
}));

// Helper to check MongoDB connection state
const isDbConnected = () => mongoose.connection.readyState === 1;

// Seed initial coupons into MongoDB if empty
export const seedInitialCoupons = async () => {
  if (!isDbConnected()) return;
  try {
    const count = await Coupon.countDocuments();
    if (count === 0) {
      await Coupon.insertMany(INITIAL_SAMPLE_COUPONS);
      console.log('🌱 Seeded 5 initial sample coupons into MongoDB');
    }
  } catch (err) {
    console.warn('⚠️ Could not seed sample coupons:', err.message);
  }
};

/**
 * @desc    Validate a coupon code and calculate server-verified pricing
 * @route   POST /api/v1/coupons/validate
 * @access  Public (Enhanced if authenticated)
 */
export const validateCoupon = async (req, res) => {
  try {
    const { code, items } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid coupon code.',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot apply coupon to an empty cart.',
      });
    }

    const cleanCode = code.trim().toUpperCase();

    // 1. Calculate raw server pricing for items
    const { pricing: rawPricing } = calculateOrderPricing(items, null);
    const itemTotal = rawPricing.itemTotal;

    if (itemTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart total must be greater than ₹0 to apply a coupon.',
      });
    }

    // 2. Fetch coupon from DB or Fallback
    let coupon = null;
    if (isDbConnected()) {
      coupon = await Coupon.findOne({ code: cleanCode });
    } else {
      coupon = fallbackCoupons.find((c) => c.code === cleanCode);
    }

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: `Coupon code '${cleanCode}' is invalid or does not exist.`,
      });
    }

    // 3. User eligibility check (first order & user usage limits)
    let userOrderCount = 0;
    const userId = req.user ? req.user._id : null;

    if (userId && isDbConnected()) {
      userOrderCount = await Order.countDocuments({ user: userId });
    }

    // Validate coupon business rules
    const now = new Date();
    if (!coupon.isActive) {
      return res.status(400).json({
        success: false,
        message: `Coupon '${cleanCode}' is currently inactive.`,
      });
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < now) {
      return res.status(400).json({
        success: false,
        message: `Coupon '${cleanCode}' expired on ${new Date(coupon.expiryDate).toLocaleDateString()}.`,
      });
    }

    if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        message: `Coupon '${cleanCode}' has reached its maximum redemption limit.`,
      });
    }

    if (itemTotal < (coupon.minOrderValue || 0)) {
      const difference = Math.ceil(coupon.minOrderValue - itemTotal);
      return res.status(400).json({
        success: false,
        message: `Add items worth ₹${difference} more to unlock coupon '${cleanCode}' (Minimum order: ₹${coupon.minOrderValue}).`,
        minOrderValue: coupon.minOrderValue,
        shortfall: difference,
      });
    }

    if (coupon.firstOrderOnly && userOrderCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Coupon '${cleanCode}' is only valid on your first order.`,
      });
    }

    if (userId && coupon.usedByUsers && coupon.usedByUsers.length > 0) {
      const userRecord = coupon.usedByUsers.find(
        (u) => u.userId && u.userId.toString() === userId.toString()
      );
      if (userRecord && userRecord.usedCount >= (coupon.perUserLimit || 1)) {
        return res.status(400).json({
          success: false,
          message: `You have already used coupon '${cleanCode}' the maximum allowed times (${coupon.perUserLimit}).`,
        });
      }
    }

    // Check city restriction if coupon is city-specific
    const citySlug = (req.body.citySlug || req.body.city || items[0]?.restaurantCitySlug || items[0]?.citySlug || '').trim().toLowerCase();
    if (coupon.citySlug && coupon.citySlug !== 'all') {
      if (!citySlug || coupon.citySlug.toLowerCase() !== citySlug) {
        const cityName = coupon.citySlug.charAt(0).toUpperCase() + coupon.citySlug.slice(1);
        return res.status(400).json({
          success: false,
          message: `Coupon '${cleanCode}' is only valid for orders in ${cityName}.`,
        });
      }
    }

    // 4. Calculate final server-verified pricing with coupon applied
    const { pricing } = calculateOrderPricing(items, coupon);

    return res.status(200).json({
      success: true,
      message: `✓ ${coupon.code} applied successfully! You saved ₹${pricing.discount}.`,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount,
        discountAmount: pricing.discount,
        citySlug: coupon.citySlug || null,
      },
      pricing,
    });
  } catch (error) {
    console.error('Error in validateCoupon:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while validating coupon.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get list of available active coupons for customers
 * @route   GET /api/v1/coupons/available
 * @access  Public
 */
export const getAvailableCoupons = async (req, res) => {
  try {
    const now = new Date();
    const city = (req.query?.city || req.query?.citySlug || '').trim().toLowerCase();
    let coupons = [];

    if (isDbConnected()) {
      const query = {
        isActive: true,
        expiryDate: { $gt: now },
      };
      if (city) {
        query.$or = [{ citySlug: null }, { citySlug: 'all' }, { citySlug: city }];
      }
      coupons = await Coupon.find(query)
        .select('code description discountType discountValue minOrderValue maxDiscount firstOrderOnly expiryDate citySlug')
        .sort({ minOrderValue: 1 });
    } else {
      coupons = INITIAL_SAMPLE_COUPONS.filter(
        (c) =>
          c.isActive &&
          new Date(c.expiryDate) > now &&
          (!city || !c.citySlug || c.citySlug === 'all' || c.citySlug.toLowerCase() === city)
      );
    }

    return res.status(200).json({
      success: true,
      count: coupons.length,
      coupons,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch available coupons.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all coupons (Admin)
 * @route   GET /api/v1/coupons
 * @access  Private / Admin
 */
export const getAllCoupons = async (req, res) => {
  try {
    let coupons = [];
    if (isDbConnected()) {
      coupons = await Coupon.find().sort({ createdAt: -1 });
    } else {
      coupons = [...fallbackCoupons];
    }

    return res.status(200).json({
      success: true,
      count: coupons.length,
      coupons,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve coupons list.',
      error: error.message,
    });
  }
};

/**
 * @desc    Create a new coupon (Admin)
 * @route   POST /api/v1/coupons
 * @access  Private / Admin
 */
export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount,
      expiryDate,
      isActive,
      usageLimit,
      perUserLimit,
      firstOrderOnly,
    } = req.body;

    if (!code || !description || !discountType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide code, description, and discountType.',
      });
    }

    const cleanCode = code.trim().toUpperCase();

    if (isDbConnected()) {
      const exists = await Coupon.findOne({ code: cleanCode });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: `Coupon '${cleanCode}' already exists.`,
        });
      }

      const newCoupon = await Coupon.create({
        code: cleanCode,
        description,
        discountType,
        discountValue: Number(discountValue) || 0,
        minOrderValue: Number(minOrderValue) || 0,
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        perUserLimit: Number(perUserLimit) || 1,
        firstOrderOnly: Boolean(firstOrderOnly),
      });

      return res.status(201).json({
        success: true,
        message: `Coupon '${cleanCode}' created successfully.`,
        coupon: newCoupon,
      });
    } else {
      const exists = fallbackCoupons.some((c) => c.code === cleanCode);
      if (exists) {
        return res.status(400).json({
          success: false,
          message: `Coupon '${cleanCode}' already exists.`,
        });
      }

      const mockCoupon = {
        _id: `mock-coupon-${Date.now()}`,
        code: cleanCode,
        description,
        discountType,
        discountValue: Number(discountValue) || 0,
        minOrderValue: Number(minOrderValue) || 0,
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        perUserLimit: Number(perUserLimit) || 1,
        firstOrderOnly: Boolean(firstOrderOnly),
        usedCount: 0,
        usedByUsers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      fallbackCoupons.unshift(mockCoupon);

      return res.status(201).json({
        success: true,
        message: `Coupon '${cleanCode}' created successfully (mock storage).`,
        coupon: mockCoupon,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create coupon.',
      error: error.message,
    });
  }
};

/**
 * @desc    Update existing coupon (Admin)
 * @route   PUT /api/v1/coupons/:id
 * @access  Private / Admin
 */
export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const updated = await Coupon.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Coupon not found.' });
      }
      return res.status(200).json({
        success: true,
        message: `Coupon '${updated.code}' updated successfully.`,
        coupon: updated,
      });
    } else {
      const idx = fallbackCoupons.findIndex((c) => c._id === id || c.code === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Coupon not found.' });
      }
      fallbackCoupons[idx] = { ...fallbackCoupons[idx], ...req.body, updatedAt: new Date() };
      return res.status(200).json({
        success: true,
        message: `Coupon '${fallbackCoupons[idx].code}' updated successfully.`,
        coupon: fallbackCoupons[idx],
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update coupon.',
      error: error.message,
    });
  }
};

/**
 * @desc    Toggle coupon active/inactive (Admin)
 * @route   PATCH /api/v1/coupons/:id/toggle
 * @access  Private / Admin
 */
export const toggleCouponStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const coupon = await Coupon.findById(id);
      if (!coupon) {
        return res.status(404).json({ success: false, message: 'Coupon not found.' });
      }
      coupon.isActive = !coupon.isActive;
      await coupon.save();
      return res.status(200).json({
        success: true,
        message: `Coupon '${coupon.code}' is now ${coupon.isActive ? 'Active' : 'Inactive'}.`,
        coupon,
      });
    } else {
      const coupon = fallbackCoupons.find((c) => c._id === id || c.code === id);
      if (!coupon) {
        return res.status(404).json({ success: false, message: 'Coupon not found.' });
      }
      coupon.isActive = !coupon.isActive;
      coupon.updatedAt = new Date();
      return res.status(200).json({
        success: true,
        message: `Coupon '${coupon.code}' is now ${coupon.isActive ? 'Active' : 'Inactive'}.`,
        coupon,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle coupon status.',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete coupon (Admin)
 * @route   DELETE /api/v1/coupons/:id
 * @access  Private / Admin
 */
export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const deleted = await Coupon.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Coupon not found.' });
      }
      return res.status(200).json({
        success: true,
        message: `Coupon '${deleted.code}' deleted successfully.`,
      });
    } else {
      const idx = fallbackCoupons.findIndex((c) => c._id === id || c.code === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Coupon not found.' });
      }
      const removed = fallbackCoupons.splice(idx, 1);
      return res.status(200).json({
        success: true,
        message: `Coupon '${removed[0].code}' deleted successfully.`,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete coupon.',
      error: error.message,
    });
  }
};
