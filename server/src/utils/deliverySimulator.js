import {
  assignDeliveryPartner,
  releaseDeliveryPartner,
} from '../models/DeliveryPartner.js';

// Configurable timing constants (in seconds)
export const DEMO_ASSIGNMENT_MIN_SECONDS =
  parseInt(process.env.DEMO_ASSIGNMENT_MIN_SECONDS, 10) || 15;
export const DEMO_ASSIGNMENT_MAX_SECONDS =
  parseInt(process.env.DEMO_ASSIGNMENT_MAX_SECONDS, 10) || 20;

export const DEMO_DELIVERY_MIN_SECONDS =
  parseInt(process.env.DEMO_DELIVERY_MIN_SECONDS, 10) || 480; // 8 minutes = 480 seconds
export const DEMO_DELIVERY_MAX_SECONDS =
  parseInt(process.env.DEMO_DELIVERY_MAX_SECONDS, 10) || 600; // 10 minutes = 600 seconds

// Default Koramangala / Indiranagar Demo Route Coordinates
export const DEFAULT_DEMO_ROUTE = {
  restaurant: {
    name: 'BiteBox Partner Kitchen (Koramangala)',
    lat: 12.9352,
    lng: 77.6245,
  },
  destination: {
    address: 'Customer Delivery Address (Indiranagar / HSR)',
    lat: 12.9279,
    lng: 77.6385,
  },
  waypoints: [
    [12.9352, 77.6245], // BiteBox Kitchen
    [12.9338, 77.628], // Turn onto 80ft Road
    [12.9315, 77.632], // Sony World Junction
    [12.9298, 77.6355], // Koramangala 6th Block Main
    [12.9279, 77.6385], // Delivery Destination
  ],
};

/**
 * Initialize simulation schedule for a new order
 */
export const createSimulationSchedule = (placedAt = new Date(), customOptions = {}) => {
  const assignmentDurationSeconds =
    customOptions.assignmentDurationSeconds ||
    Math.floor(
      DEMO_ASSIGNMENT_MIN_SECONDS +
        Math.random() * (DEMO_ASSIGNMENT_MAX_SECONDS - DEMO_ASSIGNMENT_MIN_SECONDS + 1)
    );

  const totalDeliveryDurationSeconds =
    customOptions.totalDeliveryDurationSeconds ||
    Math.floor(
      DEMO_DELIVERY_MIN_SECONDS +
        Math.random() * (DEMO_DELIVERY_MAX_SECONDS - DEMO_DELIVERY_MIN_SECONDS + 1)
    );

  const estimatedDeliveryAt = new Date(
    placedAt.getTime() + totalDeliveryDurationSeconds * 1000
  );

  const destLat =
    typeof customOptions.destinationCoordinates?.lat === 'number'
      ? customOptions.destinationCoordinates.lat
      : DEFAULT_DEMO_ROUTE.destination.lat;
  const destLng =
    typeof customOptions.destinationCoordinates?.lng === 'number'
      ? customOptions.destinationCoordinates.lng
      : DEFAULT_DEMO_ROUTE.destination.lng;

  const restLat =
    typeof customOptions.restaurantCoordinates?.lat === 'number'
      ? customOptions.restaurantCoordinates.lat
      : DEFAULT_DEMO_ROUTE.restaurant.lat;
  const restLng =
    typeof customOptions.restaurantCoordinates?.lng === 'number'
      ? customOptions.restaurantCoordinates.lng
      : DEFAULT_DEMO_ROUTE.restaurant.lng;

  // Generate realistic route waypoints connecting kitchen to selected customer destination
  const waypoints =
    typeof customOptions.destinationCoordinates?.lat === 'number'
      ? [
          [restLat, restLng],
          [
            Number((restLat * 0.75 + destLat * 0.25).toFixed(6)),
            Number((restLng * 0.75 + destLng * 0.25).toFixed(6)),
          ],
          [
            Number((restLat * 0.5 + destLat * 0.5).toFixed(6)),
            Number((restLng * 0.5 + destLng * 0.5).toFixed(6)),
          ],
          [
            Number((restLat * 0.25 + destLat * 0.75).toFixed(6)),
            Number((restLng * 0.25 + destLng * 0.75).toFixed(6)),
          ],
          [destLat, destLng],
        ]
      : DEFAULT_DEMO_ROUTE.waypoints;

  return {
    assignmentDurationSeconds,
    totalDeliveryDurationSeconds,
    estimatedDeliveryAt,
    demoSimulation: true,
    demoRoute: {
      restaurant: {
        name: customOptions.restaurantName || DEFAULT_DEMO_ROUTE.restaurant.name,
        lat: restLat,
        lng: restLng,
      },
      destination: {
        address: customOptions.destinationAddress || DEFAULT_DEMO_ROUTE.destination.address,
        lat: destLat,
        lng: destLng,
      },
      waypoints,
    },
  };
};

/**
 * Interpolate coordinate position along multi-point polyline
 * @param {Array<[number, number]>} waypoints
 * @param {number} progress (0.0 to 1.0)
 * @returns {{ lat: number, lng: number }}
 */
export const interpolateRoutePosition = (waypoints, progress) => {
  if (!waypoints || waypoints.length === 0) {
    return { lat: 12.9352, lng: 77.6245 };
  }
  if (waypoints.length === 1 || progress <= 0) {
    return { lat: waypoints[0][0], lng: waypoints[0][1] };
  }
  if (progress >= 1) {
    const last = waypoints[waypoints.length - 1];
    return { lat: last[0], lng: last[1] };
  }

  // Calculate segment lengths
  const segmentLengths = [];
  let totalLength = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const dLat = waypoints[i + 1][0] - waypoints[i][0];
    const dLng = waypoints[i + 1][1] - waypoints[i][1];
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    segmentLengths.push(dist);
    totalLength += dist;
  }

  if (totalLength === 0) {
    return { lat: waypoints[0][0], lng: waypoints[0][1] };
  }

  const targetDist = progress * totalLength;
  let accumulatedDist = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (accumulatedDist + segLen >= targetDist || i === segmentLengths.length - 1) {
      const segT = segLen > 0 ? (targetDist - accumulatedDist) / segLen : 0;
      const lat = waypoints[i][0] + (waypoints[i + 1][0] - waypoints[i][0]) * segT;
      const lng = waypoints[i][1] + (waypoints[i + 1][1] - waypoints[i][1]) * segT;
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
    accumulatedDist += segLen;
  }

  const lastPoint = waypoints[waypoints.length - 1];
  return { lat: lastPoint[0], lng: lastPoint[1] };
};

/**
 * Evaluate order progress and advance order state in DB if needed
 * @param {Object} order - Mongoose Order doc or fallback object
 * @returns {Promise<Object>} Tracking details payload
 */
export const evaluateOrderTracking = async (order) => {
  if (!order) return null;

  const orderId = order.orderId;
  const isCancelled = order.orderStatus === 'cancelled';
  const isDelivered = order.orderStatus === 'delivered';

  const placedTime = new Date(order.placedAt || order.createdAt || Date.now()).getTime();
  const now = Date.now();
  const elapsedSeconds = Math.max(0, Math.floor((now - placedTime) / 1000));

  const assignmentSeconds = order.assignmentDurationSeconds || 18;
  const totalDeliverySeconds = order.totalDeliveryDurationSeconds || 540;

  const waypoints =
    order.demoRoute && order.demoRoute.waypoints && order.demoRoute.waypoints.length > 0
      ? order.demoRoute.waypoints
      : DEFAULT_DEMO_ROUTE.waypoints;

  let currentStatus = order.orderStatus || 'placed';
  let hasChanges = false;

  if (!isCancelled && !isDelivered) {
    // 1. Check if Delivery Partner assignment time has arrived (15-20s)
    if (elapsedSeconds >= assignmentSeconds && !order.deliveryPartner) {
      const partner = await assignDeliveryPartner(orderId);
      order.deliveryPartner = partner;
      order.deliveryPartnerAssignedAt = new Date();
      if (currentStatus === 'placed') {
        currentStatus = 'confirmed';
        order.orderStatus = 'confirmed';
      }
      hasChanges = true;
    }

    // Phase timings:
    // 0 to assignmentSeconds: placed
    // assignmentSeconds to assignmentSeconds + 40: confirmed
    // assignmentSeconds + 40 to totalDeliverySeconds * 0.40: preparing
    // totalDeliverySeconds * 0.40 to totalDeliverySeconds: out_for_delivery
    // >= totalDeliverySeconds: delivered
    const prepStart = assignmentSeconds + 40;
    const outForDeliveryStart = Math.max(prepStart + 30, Math.floor(totalDeliverySeconds * 0.4));

    if (elapsedSeconds >= totalDeliverySeconds) {
      if (currentStatus !== 'delivered') {
        currentStatus = 'delivered';
        order.orderStatus = 'delivered';
        order.deliveryCompletedAt = new Date();
        order.deliveredAt = new Date();
        await releaseDeliveryPartner(orderId);
        hasChanges = true;
      }
    } else if (elapsedSeconds >= outForDeliveryStart) {
      if (currentStatus !== 'out_for_delivery') {
        currentStatus = 'out_for_delivery';
        order.orderStatus = 'out_for_delivery';
        hasChanges = true;
      }
    } else if (elapsedSeconds >= prepStart) {
      if (currentStatus !== 'preparing') {
        currentStatus = 'preparing';
        order.orderStatus = 'preparing';
        hasChanges = true;
      }
    } else if (elapsedSeconds >= assignmentSeconds) {
      if (currentStatus !== 'confirmed') {
        currentStatus = 'confirmed';
        order.orderStatus = 'confirmed';
        hasChanges = true;
      }
    }
  }

  // Persist order status change if order is a Mongoose document
  if (hasChanges && typeof order.save === 'function') {
    try {
      await order.save();
    } catch (saveErr) {
      console.warn('⚠️ Order status persistence warning:', saveErr.message);
    }
  }

  // Calculate live countdown and rider coordinate
  const estTime = order.estimatedDeliveryAt
    ? new Date(order.estimatedDeliveryAt).getTime()
    : placedTime + totalDeliverySeconds * 1000;
  const remainingSeconds = Math.max(0, Math.floor((estTime - now) / 1000));

  let simulationProgress = 0;
  let currentLocation = { lat: waypoints[0][0], lng: waypoints[0][1] };

  if (currentStatus === 'out_for_delivery') {
    const prepStart = assignmentSeconds + 40;
    const outForDeliveryStart = Math.max(prepStart + 30, Math.floor(totalDeliverySeconds * 0.4));
    const transitDuration = totalDeliverySeconds - outForDeliveryStart;
    const transitElapsed = elapsedSeconds - outForDeliveryStart;
    simulationProgress = Math.min(1, Math.max(0, transitElapsed / transitDuration));
    currentLocation = interpolateRoutePosition(waypoints, simulationProgress);
  } else if (currentStatus === 'delivered') {
    simulationProgress = 1;
    const lastPoint = waypoints[waypoints.length - 1];
    currentLocation = { lat: lastPoint[0], lng: lastPoint[1] };
  }

  return {
    orderId: order.orderId,
    orderStatus: currentStatus,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    deliveryPartner: order.deliveryPartner || null,
    deliveryPartnerAssignedAt: order.deliveryPartnerAssignedAt || null,
    placedAt: order.placedAt || order.createdAt,
    estimatedDeliveryAt: new Date(estTime),
    remainingSeconds,
    deliveryCompletedAt: order.deliveryCompletedAt || null,
    demoTracking: true,
    route: waypoints,
    restaurant: (order.demoRoute && order.demoRoute.restaurant) || DEFAULT_DEMO_ROUTE.restaurant,
    destination: (order.demoRoute && order.demoRoute.destination) || DEFAULT_DEMO_ROUTE.destination,
    currentLocation,
    simulationProgress,
  };
};
