/**
 * BiteBox Order Tracking Demo Configuration
 *
 * Configurable simulation settings for demo order progression,
 * delivery partner assignments, and simulated GPS route tracking.
 */

export const DEMO_TRACKING_CONFIG = {
  // Enabled by default in dev/demo environments unless explicitly set to 'false'
  enabled: process.env.DEMO_ORDER_TRACKING !== 'false',

  // Configurable status progression delays in seconds
  timings: {
    placed: 0,
    confirmed: parseInt(process.env.DEMO_CONFIRMED_DELAY_SEC || '10', 10),
    preparing: parseInt(process.env.DEMO_PREPARING_DELAY_SEC || '25', 10),
    outForDelivery: parseInt(process.env.DEMO_OUT_FOR_DELIVERY_DELAY_SEC || '45', 10),
    delivered: parseInt(process.env.DEMO_DELIVERED_DELAY_SEC || '90', 10),
  },

  // Simulated Bengaluru delivery route coordinates (Restaurant -> Customer)
  locations: {
    restaurant: {
      name: 'BiteBox Central Kitchen (Koramangala)',
      address: '80 Feet Road, 4th Block, Koramangala, Bengaluru, Karnataka 560034',
      lat: 12.9352,
      lng: 77.6245,
    },
    customer: {
      name: 'Delivery Destination (HSR Layout)',
      address: 'Flat 12B, Palm View Apts, 12th Main, Sector 1, HSR Layout, Bengaluru 560102',
      lat: 12.9121,
      lng: 77.6446,
    },
    // Realistic polyline street route coordinates between Koramangala and HSR Layout
    routePath: [
      [12.9352, 77.6245], // Restaurant - 80ft Road Koramangala
      [12.9328, 77.6280], // Sony World Signal
      [12.9275, 77.6322], // 100ft Intermediate Ring Road
      [12.9230, 77.6365], // Agara Lake Junction
      [12.9185, 77.6402], // 14th Main Road, HSR Sector 1
      [12.9145, 77.6428], // 12th Main Cross
      [12.9121, 77.6446], // Customer Location
    ],
  },
};
