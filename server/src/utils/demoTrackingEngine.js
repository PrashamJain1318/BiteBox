import mongoose from 'mongoose';
import { DEMO_TRACKING_CONFIG } from '../config/demoTrackingConfig.js';
import { assignDeliveryPartner, releaseDeliveryPartner } from './deliveryPartnerService.js';
import { Order } from '../models/Order.js';

const isDbConnected = () => mongoose.connection.readyState === 1;

// Keep track of active timer handles per order to prevent duplicates
const activeOrderTimers = new Map();

/**
 * Standard friendly notes for each lifecycle status
 */
const STATUS_DESCRIPTIONS = {
  placed: 'Your order has been received by BiteBox.',
  confirmed: 'Restaurant accepted your order. Kitchen is preparing fresh ingredients.',
  preparing: 'Master chef is cooking and packaging your order with safety seals.',
  out_for_delivery: 'Valet partner picked up your order and is riding towards your address.',
  delivered: 'Order delivered successfully. Enjoy your hot and fresh meal!',
  cancelled: 'Order was cancelled.',
};

/**
 * Helper to interpolate a point along a multi-segment polyline path
 * given a normalized progress parameter p in [0, 1].
 */
export const interpolatePolyline = (path, progress) => {
  if (!Array.isArray(path) || path.length === 0) return [12.9352, 77.6245];
  if (path.length === 1 || progress <= 0) return path[0];
  if (progress >= 1) return path[path.length - 1];

  const totalSegments = path.length - 1;
  const scaledProgress = progress * totalSegments;
  const segmentIndex = Math.min(Math.floor(scaledProgress), totalSegments - 1);
  const segmentT = scaledProgress - segmentIndex;

  const [lat1, lng1] = path[segmentIndex];
  const [lat2, lng2] = path[segmentIndex + 1];

  const currentLat = lat1 + (lat2 - lat1) * segmentT;
  const currentLng = lng1 + (lng2 - lng1) * segmentT;

  return [parseFloat(currentLat.toFixed(6)), parseFloat(currentLng.toFixed(6))];
};

/**
 * Calculate simulated delivery partner location and route tracking metrics
 */
export const calculateTrackingMetrics = (order, elapsedSeconds) => {
  const { locations, timings } = DEMO_TRACKING_CONFIG;
  const route = locations.routePath;

  const status = order.orderStatus;

  // Initial states before out_for_delivery
  if (status === 'placed' || status === 'confirmed' || status === 'preparing') {
    return {
      isDemoMode: DEMO_TRACKING_CONFIG.enabled,
      restaurantLocation: locations.restaurant,
      customerLocation: locations.customer,
      partnerLocation: {
        lat: locations.restaurant.lat,
        lng: locations.restaurant.lng,
        heading: 'At Restaurant Kitchen',
        speedKmh: 0,
      },
      routeCoordinates: route,
      etaMinutes: Math.max(15, 30 - Math.floor(elapsedSeconds / 3)),
      progressPercentage: status === 'placed' ? 10 : status === 'confirmed' ? 30 : 60,
    };
  }

  // Active delivery movement phase (between outForDelivery and delivered)
  if (status === 'out_for_delivery') {
    const transitStart = timings.outForDelivery; // e.g. 45s
    const transitEnd = timings.delivered; // e.g. 90s
    const transitDuration = Math.max(1, transitEnd - transitStart); // 45s

    const transitElapsed = Math.max(0, elapsedSeconds - transitStart);
    const progress = Math.min(0.98, transitElapsed / transitDuration);

    const [currentLat, currentLng] = interpolatePolyline(route, progress);
    const remainingSeconds = Math.max(0, transitEnd - elapsedSeconds);
    const etaMinutes = Math.max(1, Math.ceil(remainingSeconds / 5));

    return {
      isDemoMode: DEMO_TRACKING_CONFIG.enabled,
      restaurantLocation: locations.restaurant,
      customerLocation: locations.customer,
      partnerLocation: {
        lat: currentLat,
        lng: currentLng,
        heading: 'In Transit to Customer',
        speedKmh: 28,
      },
      routeCoordinates: route,
      etaMinutes,
      progressPercentage: Math.round(60 + progress * 35),
    };
  }

  // Final delivered phase
  return {
    isDemoMode: DEMO_TRACKING_CONFIG.enabled,
    restaurantLocation: locations.restaurant,
    customerLocation: locations.customer,
    partnerLocation: {
      lat: locations.customer.lat,
      lng: locations.customer.lng,
      heading: 'Arrived at Destination',
      speedKmh: 0,
    },
    routeCoordinates: route,
    etaMinutes: 0,
    progressPercentage: 100,
  };
};

/**
 * Evaluates an order against the demo progression timeline and persists
 * any new status changes to MongoDB or fallback store.
 */
export const evaluateAndProgressOrder = async (order) => {
  if (!order || !DEMO_TRACKING_CONFIG.enabled) return order;

  // Do not progress terminal or cancelled orders
  if (['delivered', 'cancelled'].includes(order.orderStatus)) {
    return order;
  }

  // In online payments, only progress if verified paid
  if (order.paymentMethod !== 'cod' && order.paymentStatus !== 'paid') {
    return order;
  }

  const placedTime = new Date(order.placedAt || order.createdAt || Date.now()).getTime();
  const elapsedSeconds = Math.max(0, (Date.now() - placedTime) / 1000);

  const { timings } = DEMO_TRACKING_CONFIG;

  // Determine what status the order should have reached based on elapsed time
  let targetStatus = 'placed';
  if (elapsedSeconds >= timings.delivered) {
    targetStatus = 'delivered';
  } else if (elapsedSeconds >= timings.outForDelivery) {
    targetStatus = 'out_for_delivery';
  } else if (elapsedSeconds >= timings.preparing) {
    targetStatus = 'preparing';
  } else if (elapsedSeconds >= timings.confirmed) {
    targetStatus = 'confirmed';
  }

  // Lifecycle progression sequence
  const statusSequence = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
  const currentIndex = statusSequence.indexOf(order.orderStatus);
  const targetIndex = statusSequence.indexOf(targetStatus);

  // If order needs to progress forward
  if (targetIndex > currentIndex) {
    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = [];
    }

    // Step through each intermediate milestone up to targetStatus
    for (let i = currentIndex + 1; i <= targetIndex; i++) {
      const stepStatus = statusSequence[i];
      const milestoneDelaySec =
        stepStatus === 'confirmed'
          ? timings.confirmed
          : stepStatus === 'preparing'
            ? timings.preparing
            : stepStatus === 'out_for_delivery'
              ? timings.outForDelivery
              : timings.delivered;

      const milestoneTimestamp = new Date(placedTime + milestoneDelaySec * 1000);

      // Ensure delivery partner is assigned when entering confirmed or out_for_delivery
      if (!order.deliveryPartner && (stepStatus === 'confirmed' || stepStatus === 'out_for_delivery')) {
        const assignedPartner = await assignDeliveryPartner(order.orderId);
        if (assignedPartner) {
          order.deliveryPartner = assignedPartner._id;
          order.deliveryPartnerAssignedAt = milestoneTimestamp;
        }
      }

      order.orderStatus = stepStatus;
      order.statusHistory.push({
        status: stepStatus,
        timestamp: milestoneTimestamp,
        note: STATUS_DESCRIPTIONS[stepStatus] || `Order ${stepStatus.replace('_', ' ')}`,
      });

      // Handle delivery completion
      if (stepStatus === 'delivered') {
        order.deliveredAt = milestoneTimestamp;
        // In COD orders, payment is collected upon food handover
        if (order.paymentMethod === 'cod') {
          order.paymentStatus = 'paid';
          order.paidAt = milestoneTimestamp;
        }
        await releaseDeliveryPartner(order.deliveryPartner, true);
      }
    }

    // Persist changes
    if (isDbConnected() && typeof order.save === 'function') {
      try {
        await order.save();
      } catch (saveErr) {
        console.warn(`⚠️ Error saving progressed order ${order.orderId}:`, saveErr.message);
      }
    }
  }

  return order;
};

/**
 * Schedules background timers for the demo order progression.
 * This ensures the database is automatically updated even without active client polling.
 */
export const scheduleDemoProgression = (orderId, placedTimestamp = Date.now()) => {
  if (!DEMO_TRACKING_CONFIG.enabled || !orderId) return;

  // Clear any existing timers for this order
  cancelDemoTimers(orderId);

  const { timings } = DEMO_TRACKING_CONFIG;
  const milestones = [
    { status: 'confirmed', delaySec: timings.confirmed },
    { status: 'preparing', delaySec: timings.preparing },
    { status: 'out_for_delivery', delaySec: timings.outForDelivery },
    { status: 'delivered', delaySec: timings.delivered },
  ];

  const timerHandles = [];

  for (const m of milestones) {
    const elapsedSoFar = (Date.now() - placedTimestamp) / 1000;
    const remainingMs = Math.max(200, (m.delaySec - elapsedSoFar) * 1000);

    const timer = setTimeout(async () => {
      try {
        let order = null;
        if (isDbConnected()) {
          order = await Order.findOne({ orderId });
        }
        if (order) {
          await evaluateAndProgressOrder(order);
        }
      } catch (err) {
        console.warn(`⚠️ Timer progression error for ${orderId}:`, err.message);
      }
    }, remainingMs);

    // Unref timer so it does not block Node process exit in tests
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
    timerHandles.push(timer);
  }

  activeOrderTimers.set(orderId, timerHandles);
};

/**
 * Cancel and clear scheduled timers for an order (e.g. if cancelled)
 */
export const cancelDemoTimers = (orderId) => {
  if (activeOrderTimers.has(orderId)) {
    const timers = activeOrderTimers.get(orderId);
    timers.forEach((t) => clearTimeout(t));
    activeOrderTimers.delete(orderId);
  }
};
