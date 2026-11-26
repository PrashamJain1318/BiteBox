import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Order } from '../models/Order.js';
import { Coupon } from '../models/Coupon.js';
import { SUPPORTED_CITIES } from '../models/City.js';
import { calculateOrderPricing } from '../utils/pricingCalculator.js';
import {
  createSimulationSchedule,
  evaluateOrderTracking,
} from '../utils/deliverySimulator.js';
import {
  assignDeliveryPartner,
  releaseDeliveryPartner,
  seedDeliveryPartners,
} from '../models/DeliveryPartner.js';

// Seed demo partners pool if DB connected
seedDeliveryPartners().catch(() => {});

// In-memory fallback orders store for resilient offline dev support
let fallbackOrders = [];

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

    if (!deliveryAddress || typeof deliveryAddress !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Delivery address is required.',
        field: 'deliveryAddress',
      });
    }

    const resolvedRecipientName = String(
      deliveryAddress.fullName || deliveryAddress.recipientName || ''
    ).trim();
    if (!resolvedRecipientName) {
      return res.status(400).json({
        success: false,
        message: 'Please enter recipient name.',
        field: 'recipientName',
      });
    }

    const cleanPhone = String(deliveryAddress.phone || '').trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit mobile number.',
        field: 'phone',
      });
    }

    const resolvedAddressLine = String(
      deliveryAddress.addressLine ||
      deliveryAddress.address ||
      deliveryAddress.houseNumber ||
      deliveryAddress.fullAddress ||
      ''
    ).trim();
    if (!resolvedAddressLine) {
      return res.status(400).json({
        success: false,
        message: 'Please enter street address / house number.',
        field: 'address',
      });
    }

    const resolvedArea = String(deliveryAddress.area || '').trim();
    if (!resolvedArea) {
      return res.status(400).json({
        success: false,
        message: 'Please enter delivery area / locality.',
        field: 'area',
      });
    }

    const resolvedCity = String(deliveryAddress.city || '').trim();
    if (!resolvedCity) {
      return res.status(400).json({
        success: false,
        message: 'Please enter delivery city.',
        field: 'city',
      });
    }

    const cleanPincode = String(deliveryAddress.pincode || '').trim().replace(/\D/g, '');
    if (!cleanPincode || cleanPincode.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit postal PIN code.',
        field: 'pincode',
      });
    }

    const validPaymentMethods = ['upi_qr', 'upi_app', 'card', 'netbanking', 'cod'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Choose from: ${validPaymentMethods.join(', ')}`,
      });
    }

    // Multi-city validation: items cannot belong to different cities
    const itemCitySlugs = [
      ...new Set(
        items
          .map((i) => i.restaurantCitySlug || i.citySlug || (i.restaurantCity ? i.restaurantCity.toLowerCase() : null))
          .filter(Boolean)
      ),
    ];
    if (itemCitySlugs.length > 1) {
      return res.status(400).json({
        success: false,
        message: 'Your cart contains items from restaurants in multiple cities. Please order from one city at a time.',
      });
    }

    const restaurantCitySlug =
      itemCitySlugs[0] ||
      (req.body.restaurantCitySlug ? req.body.restaurantCitySlug.toLowerCase() : null) ||
      (req.body.citySlug ? req.body.citySlug.toLowerCase() : null) ||
      null;

    // Validate delivery address city against restaurant city
    if (restaurantCitySlug && deliveryAddress.city) {
      const matchCity = (input) => {
        if (!input) return null;
        const low = String(input).trim().toLowerCase();
        for (const c of SUPPORTED_CITIES) {
          if (c.slug === low || c.name.toLowerCase() === low) return c;
          if (c.aliases && c.aliases.some((a) => a.toLowerCase() === low)) return c;
        }
        return { slug: low, name: input };
      };

      const matchedRestCity = matchCity(restaurantCitySlug);
      const matchedAddrCity = matchCity(deliveryAddress.city);

      if (matchedRestCity && matchedAddrCity && matchedRestCity.slug !== matchedAddrCity.slug) {
        return res.status(400).json({
          success: false,
          message: `Delivery address is in ${matchedAddrCity.name || deliveryAddress.city}, but your selected restaurant is in ${matchedRestCity.name || restaurantCitySlug}. Cross-city ordering is not supported. Please select an address in ${matchedRestCity.name || restaurantCitySlug}.`,
        });
      }
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
          // Check city restriction if coupon is city-specific
          if (couponRecord.citySlug && couponRecord.citySlug !== 'all') {
            const orderCity = (restaurantCitySlug || deliveryAddress.city || '').toLowerCase();
            if (!orderCity.includes(couponRecord.citySlug.toLowerCase()) && couponRecord.citySlug.toLowerCase() !== orderCity) {
              return res.status(400).json({
                success: false,
                message: `Coupon '${couponRecord.code}' is only valid for orders in ${couponRecord.citySlug.charAt(0).toUpperCase() + couponRecord.citySlug.slice(1)}.`,
              });
            }
          }
          appliedCoupon = couponRecord;
        }
      }
    }

    // Determine restaurant coordinates from city configuration or item coordinates
    const cityConfig = restaurantCitySlug
      ? SUPPORTED_CITIES.find((c) => c.slug === restaurantCitySlug || c.name.toLowerCase() === restaurantCitySlug)
      : null;
    const defaultRestCoords = cityConfig?.coordinates || { lat: 19.0596, lng: 72.8295 };
    const restCoords = items[0]?.restaurantCoords || defaultRestCoords;

    // Clean and sanitize delivery address (removes client _id strings)
    const hasValidCoords =
      deliveryAddress.coordinates &&
      typeof deliveryAddress.coordinates.lat === 'number' &&
      typeof deliveryAddress.coordinates.lng === 'number' &&
      !Number.isNaN(deliveryAddress.coordinates.lat) &&
      !Number.isNaN(deliveryAddress.coordinates.lng);

    // 2. Compute final server-side validated pricing (with distance-based delivery fee if coords provided)
    const { sanitizedItems, pricing } = calculateOrderPricing(items, appliedCoupon, {
      customerCoords: hasValidCoords ? deliveryAddress.coordinates : undefined,
      restaurantCoords: restCoords,
    });

    if (sanitizedItems.length === 0 || pricing.grandTotal < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order items or calculation error.',
      });
    }

    const orderId = generateOrderId();
    const userId = (req.user && (req.user._id || req.user.id)) || req.body.userId || `guest_${Date.now()}`;

    const sanitizedAddress = {
      fullName: resolvedRecipientName,
      recipientName: resolvedRecipientName,
      phone: cleanPhone,
      tag: ['Home', 'Work', 'College', 'Other'].includes(deliveryAddress.tag || deliveryAddress.label)
        ? (deliveryAddress.tag || deliveryAddress.label)
        : 'Home',
      label: String(deliveryAddress.label || deliveryAddress.tag || 'Home').trim(),
      addressLine: resolvedAddressLine,
      address: resolvedAddressLine,
      fullAddress: String(
        deliveryAddress.fullAddress ||
        `${resolvedAddressLine}, ${resolvedArea}, ${resolvedCity} - ${cleanPincode}`
      ).trim(),
      houseNumber: String(deliveryAddress.houseNumber || '').trim(),
      apartment: String(deliveryAddress.apartment || '').trim(),
      landmark: String(deliveryAddress.landmark || '').trim(),
      area: resolvedArea,
      city: resolvedCity,
      state: String(deliveryAddress.state || 'Maharashtra').trim(),
      pincode: cleanPincode,
      placeId: String(deliveryAddress.placeId || '').trim(),
      coordinates: hasValidCoords
        ? {
            lat: Number(deliveryAddress.coordinates.lat),
            lng: Number(deliveryAddress.coordinates.lng),
          }
        : undefined,
    };

    const placedAt = new Date();
    const simSchedule = createSimulationSchedule(placedAt, {
      restaurantName: sanitizedItems[0]?.restaurantName || 'BiteBox Partner Kitchen',
      restaurantCoordinates: restCoords,
      destinationAddress:
        sanitizedAddress.fullAddress ||
        `${sanitizedAddress.addressLine}, ${sanitizedAddress.area}`,
      destinationCoordinates: sanitizedAddress.coordinates,
    });

    // 3. For Cash on Delivery (COD)
    if (paymentMethod === 'cod') {
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
        placedAt,
        ...simSchedule,
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

      return res.status(201).json({
        success: true,
        message: 'Order placed successfully with Cash on Delivery.',
        order: savedOrder,
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
      razorpayOrderId: razorpayOrder.id,
      placedAt,
      ...simSchedule,
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
 * @access  Private
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

    // Evaluate live simulation progression so order status and partner are always up to date
    const tracking = await evaluateOrderTracking(order);

    return res.status(200).json({
      success: true,
      order,
      tracking,
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
 * @desc    Get live order tracking status & demo simulated telemetry
 * @route   GET /api/v1/orders/:id/tracking
 * @access  Private
 */
export const getOrderTracking = async (req, res) => {
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

    // Authorization check
    if (
      req.user &&
      order.user &&
      order.user.toString() !== userId?.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view tracking for this order.',
      });
    }

    const trackingData = await evaluateOrderTracking(order);

    return res.status(200).json({
      success: true,
      data: trackingData,
      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve order tracking details.',
      error: error.message,
    });
  }
};

/**
 * @desc    Fast-forward or reset demo order simulation for testing
 * @route   POST /api/v1/orders/:id/demo-advance
 * @access  Public / Dev Test Mode
 */
export const demoAdvanceOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetStatus } = req.body;

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

    const validStatuses = [
      'placed',
      'confirmed',
      'preparing',
      'out_for_delivery',
      'delivered',
      'reset',
    ];
    if (!validStatuses.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid target status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    if (targetStatus === 'reset') {
      order.orderStatus = 'placed';
      order.placedAt = new Date();
      order.deliveryPartner = null;
      order.deliveryPartnerAssignedAt = null;
      order.deliveryCompletedAt = null;
      order.deliveredAt = null;
      await releaseDeliveryPartner(order.orderId);
    } else if (targetStatus === 'confirmed') {
      if (!order.deliveryPartner) {
        order.deliveryPartner = await assignDeliveryPartner(order.orderId);
      }
      order.orderStatus = 'confirmed';
      order.deliveryPartnerAssignedAt = new Date();
    } else if (targetStatus === 'preparing') {
      if (!order.deliveryPartner) {
        order.deliveryPartner = await assignDeliveryPartner(order.orderId);
      }
      order.orderStatus = 'preparing';
    } else if (targetStatus === 'out_for_delivery') {
      if (!order.deliveryPartner) {
        order.deliveryPartner = await assignDeliveryPartner(order.orderId);
      }
      order.orderStatus = 'out_for_delivery';
    } else if (targetStatus === 'delivered') {
      order.orderStatus = 'delivered';
      order.deliveryCompletedAt = new Date();
      order.deliveredAt = new Date();
      await releaseDeliveryPartner(order.orderId);
    }

    if (typeof order.save === 'function') {
      await order.save();
    }

    const trackingData = await evaluateOrderTracking(order);

    return res.status(200).json({
      success: true,
      message: `Demo order state updated to ${targetStatus}`,
      data: trackingData,
      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to advance demo order simulation.',
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
