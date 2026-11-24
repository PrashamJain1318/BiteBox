import mongoose from 'mongoose';
import {
  DeliveryPartner,
  fallbackDeliveryPartners,
  INITIAL_DEMO_PARTNERS,
} from '../models/DeliveryPartner.js';

const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * Fair round-robin / least-active-orders assignment algorithm.
 * Selects an active, available partner whose active order count is below capacity.
 */
export const assignDeliveryPartner = async (orderId) => {
  try {
    if (isDbConnected()) {
      // 1. Fetch active, available partners who have capacity
      const candidates = await DeliveryPartner.find({
        isActive: true,
        isAvailable: true,
        $expr: { $lt: ['$currentOrders', '$maxOrders'] },
      }).sort({ currentOrders: 1, rating: -1, completedDeliveries: -1 });

      if (candidates.length > 0) {
        // Least active orders partner selected
        const selectedPartner = candidates[0];
        selectedPartner.currentOrders += 1;
        if (selectedPartner.currentOrders >= selectedPartner.maxOrders) {
          selectedPartner.isAvailable = false;
        }
        await selectedPartner.save();

        return selectedPartner;
      }

      // If no available partner with capacity
      return null;
    }

    // Fallback in-memory assignment for offline / unit tests
    const availableFallback = fallbackDeliveryPartners.filter(
      (p) => p.isActive && p.isAvailable && p.currentOrders < p.maxOrders
    );

    if (availableFallback.length > 0) {
      availableFallback.sort((a, b) => a.currentOrders - b.currentOrders);
      const selected = availableFallback[0];
      selected.currentOrders += 1;
      if (selected.currentOrders >= selected.maxOrders) {
        selected.isAvailable = false;
      }
      return selected;
    }

    return null;
  } catch (error) {
    console.warn(`⚠️ assignDeliveryPartner warning for ${orderId}:`, error.message);
    return null;
  }
};

/**
 * Releases partner capacity upon order delivery or cancellation
 */
export const releaseDeliveryPartner = async (partnerId, isDelivered = false) => {
  if (!partnerId) return;

  try {
    if (isDbConnected() && mongoose.isValidObjectId(partnerId)) {
      const partner = await DeliveryPartner.findById(partnerId);
      if (partner) {
        partner.currentOrders = Math.max(0, (partner.currentOrders || 1) - 1);
        if (partner.currentOrders < partner.maxOrders) {
          partner.isAvailable = true;
        }
        if (isDelivered) {
          partner.completedDeliveries = (partner.completedDeliveries || 0) + 1;
        }
        await partner.save();
        return partner;
      }
    }

    // In-memory fallback release
    const fallback = fallbackDeliveryPartners.find(
      (p) => p._id === partnerId || p._id.toString() === partnerId.toString()
    );
    if (fallback) {
      fallback.currentOrders = Math.max(0, (fallback.currentOrders || 1) - 1);
      if (fallback.currentOrders < fallback.maxOrders) {
        fallback.isAvailable = true;
      }
      if (isDelivered) {
        fallback.completedDeliveries = (fallback.completedDeliveries || 0) + 1;
      }
      return fallback;
    }
  } catch (err) {
    console.warn(`⚠️ releaseDeliveryPartner error for ${partnerId}:`, err.message);
  }
};

/**
 * Retrieve delivery partner details by ID
 */
export const getPartnerDetails = async (partnerId) => {
  if (!partnerId) return null;

  try {
    if (isDbConnected() && mongoose.isValidObjectId(partnerId)) {
      return await DeliveryPartner.findById(partnerId);
    }

    // Fallback
    const found = fallbackDeliveryPartners.find(
      (p) => p._id === partnerId || p._id.toString() === partnerId.toString()
    );
    return found || INITIAL_DEMO_PARTNERS[0];
  } catch {
    return null;
  }
};
