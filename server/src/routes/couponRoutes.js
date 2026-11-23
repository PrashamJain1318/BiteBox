import express from 'express';
import {
  validateCoupon,
  getAvailableCoupons,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
} from '../controllers/couponController.js';
import { protect, authorize, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public / Customer Endpoints
router.post('/validate', optionalAuth, validateCoupon);
router.get('/available', getAvailableCoupons);

// Admin Coupon Management Endpoints
router.get('/', protect, authorize('admin'), getAllCoupons);
router.post('/', protect, authorize('admin'), createCoupon);
router.put('/:id', protect, authorize('admin'), updateCoupon);
router.patch('/:id/toggle', protect, authorize('admin'), toggleCouponStatus);
router.delete('/:id', protect, authorize('admin'), deleteCoupon);

export default router;
