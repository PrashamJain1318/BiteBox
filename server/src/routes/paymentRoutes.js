import express from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
  createStandardOrder,
  verifyStandardPayment,
} from '../controllers/paymentController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Standard Razorpay Order Creation (accepts { amount (paise), currency, receipt } or BiteBox orderId)
router.post('/create-order', optionalAuth, (req, res, next) => {
  if (req.body && req.body.amount !== undefined) {
    return createStandardOrder(req, res, next);
  }
  return protect(req, res, () => createPaymentOrder(req, res, next));
});

// Standard Razorpay Signature Verification
router.post('/verify', optionalAuth, (req, res, next) => {
  if (req.body && (req.body.order_id || req.body.signature)) {
    return verifyStandardPayment(req, res, next);
  }
  return protect(req, res, () => verifyPayment(req, res, next));
});

router.post('/verify-payment', optionalAuth, verifyStandardPayment);
router.post('/webhook', handleWebhook);

export default router;
