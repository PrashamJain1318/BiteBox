import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  getOrderTracking,
  demoAdvanceOrder,
  cancelOrder,
} from '../controllers/orderController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Retrieve orders (user's orders if logged in, or recent orders)
router.get('/', optionalAuth, getMyOrders);

// Create a new order (COD or Online)
router.post('/', optionalAuth, createOrder);

// User's order history
router.get('/my-orders', optionalAuth, getMyOrders);

// Live order tracking telemetry & demo route endpoint
router.get('/:id/tracking', optionalAuth, getOrderTracking);

// Fast-forward or reset demo order simulation
router.post('/:id/demo-advance', optionalAuth, demoAdvanceOrder);

// Single order details
router.get('/:id', optionalAuth, getOrderById);

// Cancel order
router.post('/:id/cancel', protect, cancelOrder);

export default router;
