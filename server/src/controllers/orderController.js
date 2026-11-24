import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Order } from '../models/Order.js';
import { Coupon } from '../models/Coupon.js';
import { calculateOrderPricing } from '../utils/pricingCalculator.js';
import {
  assignDeliveryPartner,
  releaseDeliveryPartner,
  getPartnerDetails,
} from '../utils/deliveryPartnerService.js';
import {
  evaluateAndProgressOrder,
  calculateTrackingMetrics,
  scheduleDemoProgression,
  cancelDemoTimers,
} from '../utils/demoTrackingEngine.js';
import { DEMO_TRACKING_CONFIG } from '../config/demoTrackingConfig.js';

// In-memory fallback orders store for resilient offline dev support
export let fallbackOrders = [];

// Helper to check MongoDB connection state
const isDbConnected = () => mongoose.connection.readyState === 1;

// Razorpay SDK initialization
const getRazorpayInstance = () => {
  const key_id =
    process.env.RAZORPAY_KEY_ID ||
    process.env.VITE_RAZORPAY_KEY_ID ||
    'rzp_test_U3XVWhxIjnRiov';
  const key_secret =
    process.env.RAZORPAY_KEY_SECRET ||
    'jChvekU98UzPzwK70UFbV7li';

  try {
    return new Razorpay({
      key_id,
      key_secret,
    });
  } catch (err) {
    console.warn('⚠️ Razorpay constructor warning:', err.message);
    return null;
  }
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
 * @access  Private / Optional Auth
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
        const { INITIAL_SAMPLE_COUPONS } = await import('../models/Coupon.js');
        couponRecord = INITIAL_SAMPLE_COUPONS.find((c) => c.code === cleanCode && c.isActive);
      }

      if (couponRecord) {
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
    const userId = (req.user && (req.user._id || req.user.id)) || req.body.userId || `guest_${Date.now()}`;

    // Clean and sanitize delivery address (removes client _id strings)
    const sanitizedAddress = {
      fullName: String(deliveryAddress.fullName || '').trim(),
      phone: String(deliveryAddress.phone || '').trim(),
      tag: ['Home', 'Work', 'Other'].includes(deliveryAddress.tag) ? deliveryAddress.tag : 'Home',
      addressLine: String(deliveryAddress.addressLine || '').trim(),
      area: String(deliveryAddress.area || '').trim(),
      city: String(deliveryAddress.city || 'Mumbai').trim(),
      pincode: String(deliveryAddress.pincode || '').trim(),
    };

    // 3. For Cash on Delivery (COD)
    if (paymentMethod === 'cod') {
      // Dynamically select available delivery partner
      const assignedPartner = await assignDeliveryPartner(orderId);
      const placedTimestamp = new Date();

      const orderPayload = {
        orderId,
        user: userId,
        items: sanitizedItems,
        deliveryAddress: sanitizedAddress,
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
        orderStatus: 'placed',
        deliveryPartner: assignedPartner ? assignedPartner._id : null,
        deliveryPartnerAssignedAt: assignedPartner ? placedTimestamp : null,
        statusHistory: [
          {
            status: 'placed',
            timestamp: placedTimestamp,
            note: 'Order placed successfully with Cash on Delivery.',
          },
        ],
        estimatedDeliveryMinutes: 30,
        placedAt: placedTimestamp,
      };

      let savedOrder = null;
      if (isDbConnected()) {
        try {
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
        } catch (dbErr) {
          console.warn('⚠️ Order.create DB error (COD), using resilient fallback:', dbErr.message);
          savedOrder = {
            ...orderPayload,
            _id: `mock-order-${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          fallbackOrders.unshift(savedOrder);
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

      // Schedule demo background progression timers
      scheduleDemoProgression(orderId, placedTimestamp.getTime());

      return res.status(201).json({
        success: true,
        message: 'Order placed successfully with Cash on Delivery.',
        order: savedOrder,
        deliveryPartner: assignedPartner,
      });
    }

    // 4. For Online Payments (UPI, Cards, NetBanking via Razorpay)
    let razorpayOrder = null;
    const amountInPaise = Math.round(pricing.grandTotal * 100);

    try {
      const razorpayInstance = getRazorpayInstance();
      if (razorpayInstance) {
        razorpayOrder = await razorpayInstance.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: orderId,
          notes: {
            biteboxOrderId: orderId,
            userId: userId ? userId.toString() : 'guest',
            paymentMethod,
          },
        });
      }
    } catch (rzpErr) {
      console.warn('⚠️ Razorpay live order creation fallback (Test Mode Active):', rzpErr.message);
    }

    if (!razorpayOrder || !razorpayOrder.id) {
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
      deliveryAddress: sanitizedAddress,
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
      deliveryPartner: null,
      statusHistory: [
        {
          status: 'placed',
          timestamp: new Date(),
          note: 'Order created. Complete payment to confirm.',
        },
      ],
      estimatedDeliveryMinutes: 30,
      razorpayOrderId: razorpayOrder.id,
      placedAt: new Date(),
    };

    let savedOrder = null;
    if (isDbConnected()) {
      try {
        savedOrder = await Order.create(onlineOrderPayload);
      } catch (dbErr) {
        console.warn('⚠️ Order.create DB error (Online), using resilient fallback:', dbErr.message);
        savedOrder = {
          ...onlineOrderPayload,
          _id: `mock-order-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        fallbackOrders.unshift(savedOrder);
      }
    } else {
      savedOrder = {
        ...onlineOrderPayload,
        _id: `mock-order-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      fallbackOrders.unshift(savedOrder);
    }

    const razorpayKeyId =
      process.env.RAZORPAY_KEY_ID ||
      process.env.VITE_RAZORPAY_KEY_ID ||
      'rzp_test_U3XVWhxIjnRiov';

    return res.status(201).json({
      success: true,
      message: 'Order created. Complete payment to confirm.',
      order: savedOrder,
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: razorpayKeyId,
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
 * @access  Private / Optional Auth
 */
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user ? (req.user._id || req.user.id) : null;
    let orders = [];

    if (isDbConnected()) {
      if (userId) {
        orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
      } else {
        orders = await Order.find().sort({ createdAt: -1 }).limit(20);
      }
    } else {
      if (userId) {
        orders = fallbackOrders.filter((o) => o.user && o.user.toString() === userId.toString());
      } else {
        orders = fallbackOrders.slice(0, 20);
      }
    }

    // Evaluate demo progression for active orders
    for (let i = 0; i < orders.length; i++) {
      if (!['delivered', 'cancelled'].includes(orders[i].orderStatus)) {
        orders[i] = await evaluateAndProgressOrder(orders[i]);
      }
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
 * @desc    Get single order details by ID with live progression & partner
 * @route   GET /api/v1/orders/:id
 * @access  Private / Optional Auth
 */
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? (req.user._id || req.user.id) : null;

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

    // Security check: if user is authenticated and order has an owner, check authorization unless admin
    if (req.user && order.user && order.user.toString() !== userId?.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this order.',
      });
    }

    // Evaluate and progress demo order status based on elapsed time
    order = await evaluateAndProgressOrder(order);

    // Fetch assigned partner details
    let partnerInfo = null;
    if (order.deliveryPartner) {
      partnerInfo = await getPartnerDetails(order.deliveryPartner);
    }

    // Calculate live simulated tracking metrics
    const placedTime = new Date(order.placedAt || order.createdAt || Date.now()).getTime();
    const elapsedSeconds = Math.max(0, (Date.now() - placedTime) / 1000);
    const trackingMetrics = calculateTrackingMetrics(order, elapsedSeconds);

    return res.status(200).json({
      success: true,
      order,
      deliveryPartner: partnerInfo,
      tracking: trackingMetrics,
      demoMode: DEMO_TRACKING_CONFIG.enabled,
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
 * @desc    Get detailed live order tracking metrics
 * @route   GET /api/v1/orders/:id/tracking
 * @access  Private / Optional Auth
 */
export const getOrderTracking = async (req, res) => {
  return getOrderById(req, res);
};

/**
 * @desc    Authorized status transition endpoint (Admin / Staff / Partner)
 * @route   PATCH /api/v1/orders/:id/status
 * @access  Protected
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const validStatuses = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid order status. Allowed: ${validStatuses.join(', ')}`,
      });
    }

    // Role check: Only admin, restaurant staff, or delivery partner can update order status directly
    const allowedRoles = ['admin', 'restaurant_staff', 'delivery_partner'];
    const userRole = req.user?.role;
    const isDemoOverride = DEMO_TRACKING_CONFIG.enabled && req.headers['x-demo-admin'] === 'true';

    if (!isDemoOverride && (!req.user || !allowedRoles.includes(userRole))) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update order status. Customers cannot directly set status.',
      });
    }

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

    // Allowed status transitions
    const validTransitions = {
      placed: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['out_for_delivery', 'cancelled'],
      out_for_delivery: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: [],
    };

    if (
      !isDemoOverride &&
      order.orderStatus !== status &&
      !validTransitions[order.orderStatus]?.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from '${order.orderStatus}' to '${status}'.`,
      });
    }

    // When progressing to out_for_delivery, assign partner if not yet assigned
    if (status === 'out_for_delivery' && !order.deliveryPartner) {
      const partner = await assignDeliveryPartner(order.orderId);
      if (partner) {
        order.deliveryPartner = partner._id;
        order.deliveryPartnerAssignedAt = new Date();
      }
    }

    // When delivered
    if (status === 'delivered') {
      order.deliveredAt = new Date();
      if (order.paymentMethod === 'cod') {
        order.paymentStatus = 'paid';
        order.paidAt = new Date();
      }
      await releaseDeliveryPartner(order.deliveryPartner, true);
      cancelDemoTimers(order.orderId);
    }

    // When cancelled
    if (status === 'cancelled') {
      await releaseDeliveryPartner(order.deliveryPartner, false);
      cancelDemoTimers(order.orderId);
    }

    order.orderStatus = status;
    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Status updated to ${status.replace('_', ' ')} by authorized staff.`,
    });

    if (isDbConnected() && typeof order.save === 'function') {
      await order.save();
    }

    let partnerInfo = null;
    if (order.deliveryPartner) {
      partnerInfo = await getPartnerDetails(order.deliveryPartner);
    }

    return res.status(200).json({
      success: true,
      message: `Order status updated to '${status}'.`,
      order,
      deliveryPartner: partnerInfo,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update order status.',
      error: error.message,
    });
  }
};

/**
 * @desc    Reset demo tracking timeline and restart simulation (Demo / Testing)
 * @route   POST /api/v1/orders/:id/reset-demo
 * @access  Private / Optional Auth
 */
export const resetDemoTracking = async (req, res) => {
  try {
    const { id } = req.params;

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

    cancelDemoTimers(order.orderId);

    // Release existing partner if assigned
    if (order.deliveryPartner) {
      await releaseDeliveryPartner(order.deliveryPartner, false);
    }

    // Select next partner dynamically to demonstrate round-robin
    const newPartner = await assignDeliveryPartner(order.orderId);

    const now = new Date();
    order.orderStatus = 'placed';
    order.placedAt = now;
    order.createdAt = now;
    order.deliveredAt = null;
    order.deliveryPartner = newPartner ? newPartner._id : null;
    order.deliveryPartnerAssignedAt = newPartner ? now : null;

    if (order.paymentMethod === 'cod') {
      order.paymentStatus = 'unpaid';
      order.paidAt = null;
    }

    order.statusHistory = [
      {
        status: 'placed',
        timestamp: now,
        note: 'Demo tracking simulation restarted.',
      },
    ];

    if (isDbConnected() && typeof order.save === 'function') {
      await order.save();
    }

    // Re-schedule progression timers
    scheduleDemoProgression(order.orderId, Date.now());

    let partnerInfo = null;
    if (order.deliveryPartner) {
      partnerInfo = await getPartnerDetails(order.deliveryPartner);
    }

    return res.status(200).json({
      success: true,
      message: 'Demo tracking timeline reset. Simulation restarted.',
      order,
      deliveryPartner: partnerInfo,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reset demo tracking.',
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
    const userId = req.user ? (req.user._id || req.user.id) : null;

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

    if (userId && order.user && order.user.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this order.' });
    }

    if (['delivered', 'cancelled'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled as it is already ${order.orderStatus}.`,
      });
    }

    cancelDemoTimers(order.orderId);
    if (order.deliveryPartner) {
      await releaseDeliveryPartner(order.deliveryPartner, false);
    }

    order.orderStatus = 'cancelled';
    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: 'Order cancelled by user.',
    });

    if (isDbConnected() && typeof order.save === 'function') {
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
