import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  getOrderTracking,
  updateOrderStatus,
  resetDemoTracking,
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

// Single order details
router.get('/:id', optionalAuth, getOrderById);

// Live order tracking metrics & simulated map data
router.get('/:id/tracking', optionalAuth, getOrderTracking);

// Update order status (protected: authorized admin/staff/partner)
router.patch('/:id/status', optionalAuth, updateOrderStatus);

// Reset demo order tracking (for demo / testing)
router.post('/:id/reset-demo', optionalAuth, resetDemoTracking);

// Cancel order
router.post('/:id/cancel', protect, cancelOrder);

export default router;
