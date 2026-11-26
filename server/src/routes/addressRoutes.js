import express from 'express';
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../controllers/addressController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// List all user's addresses
router.get('/', optionalAuth, getAddresses);

// Create new address
router.post('/', optionalAuth, createAddress);

// Update address
router.put('/:addressId', optionalAuth, updateAddress);

// Delete address
router.delete('/:addressId', optionalAuth, deleteAddress);

// Set default address
router.patch('/:addressId/default', optionalAuth, setDefaultAddress);

export default router;
