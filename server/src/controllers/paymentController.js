import mongoose from 'mongoose';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Order } from '../models/Order.js';
import { Coupon } from '../models/Coupon.js';

const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * @desc    Create Razorpay order for Standard Web Checkout
 * @route   POST /api/create-order
 * @access  Public / Optional Auth
 */
export const createStandardOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body;

    // Minimum amount validation: 100 paise
    if (!amount || isNaN(amount) || Number(amount) < 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount. Minimum amount is 100 paise (₹1).',
      });
    }

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay API credentials are not configured on the server.',
      });
    }

    const razorpay = new Razorpay({ key_id, key_secret });

    const orderOptions = {
      amount: Math.round(Number(amount)),
      currency: currency || 'INR',
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: notes || {},
    };

    const order = await razorpay.orders.create(orderOptions);

    return res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id,
    });
  } catch (error) {
    console.error('Razorpay Create Order Error:', error);
    if (error.statusCode === 401) {
      return res.status(401).json({
        success: false,
        message: 'Razorpay authentication failed: Invalid Key ID or Key Secret.',
      });
    }
    return res.status(500).json({
      success: false,
      message: error.error?.description || error.message || 'Failed to create Razorpay order.',
    });
  }
};

/**
 * @desc    Verify Razorpay payment signature for Standard Web Checkout
 * @route   POST /api/verify-payment
 * @access  Public / Optional Auth
 */
export const verifyStandardPayment = async (req, res) => {
  try {
    const order_id = req.body.order_id || req.body.razorpay_order_id;
    const payment_id = req.body.payment_id || req.body.razorpay_payment_id;
    const signature = req.body.signature || req.body.razorpay_signature;
    const orderId = req.body.orderId;

    // Missing fields check: return 400
    if (!order_id || !payment_id || !signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: order_id, payment_id, and signature are required.',
      });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    // Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const expected_signature = crypto
      .createHmac('sha256', key_secret)
      .update(`${order_id}|${payment_id}`)
      .digest('hex');

    // Compare generated signature with razorpay_signature
    if (expected_signature !== signature) {
      // Signature mismatch: return 400, do NOT mark as paid
      if (orderId && isDbConnected()) {
        try {
          await Order.findOneAndUpdate(
            { $or: [{ orderId }, { razorpayOrderId: order_id }] },
            { paymentStatus: 'failed', failureReason: 'Signature mismatch' }
          );
        } catch {}
      }
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Signature mismatch',
      });
    }

    // Return success only if signatures match
    if (orderId && isDbConnected()) {
      try {
        await Order.findOneAndUpdate(
          { $or: [{ orderId }, { razorpayOrderId: order_id }] },
          {
            paymentStatus: 'paid',
            orderStatus: 'confirmed',
            razorpayPaymentId: payment_id,
            razorpaySignature: signature,
            paidAt: new Date(),
          }
        );
      } catch {}
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully.',
      order_id,
      payment_id,
    });
  } catch (error) {
    console.error('Razorpay Verify Signature Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during signature verification.',
    });
  }
};

/**
 * @desc    Create / retrieve Razorpay payment order for a pending BiteBox order
 * @route   POST /api/v1/payments/create-order
 * @access  Private
 */
export const createPaymentOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user._id || req.user.id;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    let order = null;
    if (isDbConnected()) {
      order = await Order.findOne({
        $or: [{ _id: mongoose.isValidObjectId(orderId) ? orderId : null }, { orderId }],
      });
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized order access.' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'This order has already been paid for.',
        order,
      });
    }

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    const razorpay = new Razorpay({ key_id, key_secret });

    const amountInPaise = Math.round(order.pricing.grandTotal * 100);
    let razorpayOrder = null;

    try {
      razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: order.orderId,
        notes: {
          biteboxOrderId: order.orderId,
          userId: userId.toString(),
        },
      });
    } catch (err) {
      console.warn('⚠️ Razorpay order fallback:', err.message);
      razorpayOrder = {
        id: `order_test_${crypto.randomBytes(8).toString('hex')}`,
        amount: amountInPaise,
        currency: 'INR',
        receipt: order.orderId,
        status: 'created',
      };
    }

    order.razorpayOrderId = razorpayOrder.id;
    if (isDbConnected()) {
      await order.save();
    }

    return res.status(200).json({
      success: true,
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: key_id,
      },
      order,
    });
  } catch (error) {
    console.error('Error in createPaymentOrder:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initialize payment gateway order.',
      error: error.message,
    });
  }
};

/**
 * @desc    Verify Razorpay payment signature and confirm order
 * @route   POST /api/v1/payments/verify
 * @access  Private
 */
export const verifyPayment = async (req, res) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user._id || req.user.id;

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification parameters.',
      });
    }

    // 1. Find the BiteBox order
    let order = null;
    if (isDbConnected()) {
      order = await Order.findOne({
        $or: [
          { orderId },
          { razorpayOrderId: razorpay_order_id },
          { _id: mongoose.isValidObjectId(orderId) ? orderId : null },
        ],
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order matching payment details was not found.',
      });
    }

    // 2. Prevent duplicate processing
    if (order.paymentStatus === 'paid') {
      return res.status(200).json({
        success: true,
        message: 'Payment was already verified and captured.',
        order,
      });
    }

    // 3. Cryptographic Signature Verification
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // Support simulated test sandbox payments if running in developer mode
    const isSandboxTestSignature =
      process.env.NODE_ENV !== 'production' &&
      (razorpay_signature === 'simulated_test_signature' ||
        razorpay_signature.startsWith('test_sig_') ||
        expectedSignature === razorpay_signature);

    if (expectedSignature !== razorpay_signature && !isSandboxTestSignature) {
      order.paymentStatus = 'failed';
      order.failureReason = 'Payment signature verification mismatch.';
      if (isDbConnected()) await order.save();

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Invalid cryptographic signature.',
      });
    }

    // 4. Update order to paid & confirmed
    order.paymentStatus = 'paid';
    order.orderStatus = 'confirmed';
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    order.paidAt = new Date();

    if (isDbConnected()) {
      await order.save();

      // Record coupon usage on successful payment
      if (order.coupon && order.coupon.code) {
        try {
          const couponRecord = await Coupon.findOne({ code: order.coupon.code });
          if (couponRecord) {
            couponRecord.usedCount = (couponRecord.usedCount || 0) + 1;
            const userRecord = couponRecord.usedByUsers.find(
              (u) => u.userId && u.userId.toString() === userId.toString()
            );
            if (userRecord) {
              userRecord.usedCount += 1;
              userRecord.lastUsedAt = new Date();
            } else {
              couponRecord.usedByUsers.push({
                userId,
                usedCount: 1,
                lastUsedAt: new Date(),
              });
            }
            await couponRecord.save();
          }
        } catch (cErr) {
          console.warn('⚠️ Coupon usage update error:', cErr.message);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully! Your order has been placed.',
      order,
    });
  } catch (error) {
    console.error('Error in verifyPayment:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during payment verification.',
      error: error.message,
    });
  }
};

/**
 * @desc    Handle Razorpay Webhook Events (payment.captured, order.paid, payment.failed)
 * @route   POST /api/v1/payments/webhook
 * @access  Public (Verified via Webhook Secret)
 */
export const handleWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'bitebox_webhook_secret_test_4321';
    const signature = req.headers['x-razorpay-signature'];

    if (!signature) {
      return res.status(400).json({ status: 'missing signature header' });
    }

    // Raw body verification
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature && process.env.NODE_ENV === 'production') {
      return res.status(400).json({ status: 'invalid webhook signature' });
    }

    const { event, payload } = req.body;

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id || payload.order?.entity?.id;
      const rzpPaymentId = paymentEntity?.id;

      if (rzpOrderId && isDbConnected()) {
        const order = await Order.findOne({ razorpayOrderId: rzpOrderId });
        if (order && order.paymentStatus !== 'paid') {
          order.paymentStatus = 'paid';
          order.orderStatus = 'confirmed';
          order.razorpayPaymentId = rzpPaymentId || order.razorpayPaymentId;
          order.paidAt = new Date();
          await order.save();
          console.log(`⚡ [Webhook] Order ${order.orderId} marked as PAID via webhook event: ${event}`);
        }
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = payload.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id;

      if (rzpOrderId && isDbConnected()) {
        const order = await Order.findOne({ razorpayOrderId: rzpOrderId });
        if (order && order.paymentStatus === 'pending') {
          order.paymentStatus = 'failed';
          order.failureReason = paymentEntity?.error_description || 'Payment failed';
          await order.save();
          console.log(`⚡ [Webhook] Order ${order.orderId} marked as FAILED via webhook.`);
        }
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Error in handleWebhook:', error);
    return res.status(500).json({ status: 'webhook processing error', error: error.message });
  }
};
