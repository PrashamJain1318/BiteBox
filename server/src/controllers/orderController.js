import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Order } from '../models/Order.js';
import { Coupon } from '../models/Coupon.js';
import { calculateOrderPricing } from '../utils/pricingCalculator.js';

// In-memory fallback orders store for resilient offline dev support
let fallbackOrders = [];

// Helper to check MongoDB connection state
const isDbConnected = () => mongoose.connection.readyState === 1;

// Razorpay SDK initialization
const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_BiteBoxDemoKey123';
  const key_secret = process.env.RAZORPAY_KEY_SECRET || 'bitebox_razorpay_secret_test_98765';

  return new Razorpay({
    key_id,
    key_secret,
  });
};

/**
 * Generate a friendly human-readable BiteBox Order ID like BB-2026-89412
 */
const generateOrderId = () => {
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `BB-2026-${randomSuffix}`;
};

/**
 * @desc    Create a new order & initiate Razorpay order if online payment
 * @route   POST /api/v1/orders
 * @access  Private
 */
export const createOrder = async (req, res) => {
  try {
    const { items, deliveryAddress, couponCode, paymentMethod } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty. Please add items to checkout.',
      });
    }

    if (
      !deliveryAddress ||
      !deliveryAddress.fullName ||
      !deliveryAddress.phone ||
      !deliveryAddress.addressLine ||
      !deliveryAddress.area ||
      !deliveryAddress.city ||
      !deliveryAddress.pincode
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a complete delivery address with recipient name, phone, and pincode.',
      });
    }

    const validPaymentMethods = ['upi_qr', 'upi_app', 'card', 'netbanking', 'cod'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Choose from: ${validPaymentMethods.join(', ')}`,
      });
    }

    // 1. Fetch coupon if provided and validate server-side
    let appliedCoupon = null;
    let couponRecord = null;

    if (couponCode && typeof couponCode === 'string') {
      const cleanCode = couponCode.trim().toUpperCase();
      if (isDbConnected()) {
        couponRecord = await Coupon.findOne({ code: cleanCode, isActive: true });
      } else {
        // Look up in fallback coupons
        const { INITIAL_SAMPLE_COUPONS } = await import('../models/Coupon.js');
        couponRecord = INITIAL_SAMPLE_COUPONS.find((c) => c.code === cleanCode && c.isActive);
      }

      if (couponRecord) {
        // Pre-validate coupon before applying
        const rawPricing = calculateOrderPricing(items, null).pricing;
        if (rawPricing.itemTotal >= (couponRecord.minOrderValue || 0)) {
          appliedCoupon = couponRecord;
        }
      }
    }

    // 2. Compute final server-side validated pricing
    const { sanitizedItems, pricing } = calculateOrderPricing(items, appliedCoupon);

    if (sanitizedItems.length === 0 || pricing.grandTotal < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order items or calculation error.',
      });
    }

    const orderId = generateOrderId();
    const userId = req.user._id || req.user.id;

    // 3. For Cash on Delivery (COD)
    if (paymentMethod === 'cod') {
      const orderPayload = {
        orderId,
        user: userId,
        items: sanitizedItems,
        deliveryAddress,
        coupon: appliedCoupon
          ? {
              code: appliedCoupon.code,
              discountAmount: pricing.discount,
              discountType: appliedCoupon.discountType,
            }
          : { code: null, discountAmount: 0 },
        pricing,
        paymentMethod: 'cod',
        paymentStatus: 'unpaid',
        orderStatus: 'confirmed',
        placedAt: new Date(),
      };

      let savedOrder = null;
      if (isDbConnected()) {
        savedOrder = await Order.create(orderPayload);

        // Record coupon usage
        if (appliedCoupon && couponRecord) {
          couponRecord.usedCount = (couponRecord.usedCount || 0) + 1;
          const userUsage = couponRecord.usedByUsers.find(
            (u) => u.userId && u.userId.toString() === userId.toString()
          );
          if (userUsage) {
            userUsage.usedCount += 1;
            userUsage.lastUsedAt = new Date();
          } else {
            couponRecord.usedByUsers.push({
              userId,
              usedCount: 1,
              lastUsedAt: new Date(),
            });
          }
          await couponRecord.save();
        }
      } else {
        savedOrder = {
          ...orderPayload,
          _id: `mock-order-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        fallbackOrders.unshift(savedOrder);
      }

      return res.status(201).json({
        success: true,
        message: 'Order confirmed successfully with Cash on Delivery.',
        order: savedOrder,
      });
    }

    // 4. For Online Payments (UPI, Cards, NetBanking via Razorpay)
    let razorpayOrder = null;
    const razorpayInstance = getRazorpayInstance();
    const amountInPaise = Math.round(pricing.grandTotal * 100);

    try {
      razorpayOrder = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: orderId,
        notes: {
          biteboxOrderId: orderId,
          userId: userId.toString(),
          paymentMethod,
        },
      });
    } catch (rzpErr) {
      console.warn('⚠️ Razorpay live order creation fallback (Test Mode Active):', rzpErr.message);
      // Resilient fallback order for sandbox testing when test keys aren't linked to live Razorpay account
      razorpayOrder = {
        id: `order_test_${crypto.randomBytes(8).toString('hex')}`,
        entity: 'order',
        amount: amountInPaise,
        amount_paid: 0,
        amount_due: amountInPaise,
        currency: 'INR',
        receipt: orderId,
        status: 'created',
        attempts: 0,
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    const onlineOrderPayload = {
      orderId,
      user: userId,
      items: sanitizedItems,
      deliveryAddress,
      coupon: appliedCoupon
        ? {
            code: appliedCoupon.code,
            discountAmount: pricing.discount,
            discountType: appliedCoupon.discountType,
          }
        : { code: null, discountAmount: 0 },
      pricing,
      paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'placed',
      razorpayOrderId: razorpayOrder.id,
      placedAt: new Date(),
    };

    let savedOrder = null;
    if (isDbConnected()) {
      savedOrder = await Order.create(onlineOrderPayload);
    } else {
      savedOrder = {
        ...onlineOrderPayload,
        _id: `mock-order-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      fallbackOrders.unshift(savedOrder);
    }

    return res.status(201).json({
      success: true,
      message: 'Order created. Complete payment to confirm.',
      order: savedOrder,
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_BiteBoxDemoKey123',
      },
    });
  } catch (error) {
    console.error('Error in createOrder:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create order.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get logged-in user's order history
 * @route   GET /api/v1/orders/my-orders
 * @access  Private
 */
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    let orders = [];

    if (isDbConnected()) {
      orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
    } else {
      orders = fallbackOrders.filter((o) => o.user.toString() === userId.toString());
    }

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve order history.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get single order details by ID
 * @route   GET /api/v1/orders/:id
 * @access  Private
 */
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    let order = null;
    if (isDbConnected()) {
      order = await Order.findOne({
        $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { orderId: id }],
      });
    } else {
      order = fallbackOrders.find((o) => o._id === id || o.orderId === id);
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // Security check: ensure requesting user owns this order or is admin
    if (order.user.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this order.',
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch order details.',
      error: error.message,
    });
  }
};

/**
 * @desc    Cancel an order
 * @route   POST /api/v1/orders/:id/cancel
 * @access  Private
 */
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    let order = null;
    if (isDbConnected()) {
      order = await Order.findOne({
        $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { orderId: id }],
      });
    } else {
      order = fallbackOrders.find((o) => o._id === id || o.orderId === id);
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.user.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this order.' });
    }

    if (['delivered', 'cancelled'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled as it is already ${order.orderStatus}.`,
      });
    }

    order.orderStatus = 'cancelled';
    if (isDbConnected()) {
      await order.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully.',
      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel order.',
      error: error.message,
    });
  }
};
