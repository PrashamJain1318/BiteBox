import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDistanceInKm,
  calculateOrderPricing,
} from '../server/src/utils/pricingCalculator.js';
import {
  createAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../server/src/controllers/addressController.js';
import { createOrder } from '../server/src/controllers/orderController.js';

test('BiteBox Google Maps & Address Management Test Suite', async (t) => {
  // Test Mock helper
  const createMockRes = () => {
    const res = {
      statusCode: 200,
      headers: {},
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      },
    };
    return res;
  };

  // 1. Distance Calculation & Dynamic Delivery Fee
  await t.test('1. Haversine distance calculator calculates accurate distance', () => {
    // Distance between Bandra West (19.0607, 72.8362) and BKC (19.0673, 72.8687) is ~3.5 km
    const dist = calculateDistanceInKm(19.0607, 72.8362, 19.0673, 72.8687);
    assert.ok(dist >= 3.0 && dist <= 4.0, `Calculated distance ${dist} km should be ~3.5 km`);

    // Zero distance for same coordinates
    const zeroDist = calculateDistanceInKm(19.0607, 72.8362, 19.0607, 72.8362);
    assert.equal(zeroDist, 0);
  });

  await t.test('2. Dynamic delivery fee calculation based on coordinates and cart thresholds', () => {
    const sampleItems = [{ productId: 'test-1', name: 'Burger', price: 150, quantity: 1 }];

    // Near location (<= 4km): Base fee 40
    const nearResult = calculateOrderPricing(sampleItems, null, {
      customerCoords: { lat: 19.0607, lng: 72.8362 },
      restaurantCoords: { lat: 19.0596, lng: 72.8295 },
    });
    assert.equal(nearResult.pricing.deliveryFee, 40, 'Near distance delivery fee should be base ₹40');

    // Far location (> 4km): Base fee + 10/km
    const farResult = calculateOrderPricing(sampleItems, null, {
      customerCoords: { lat: 19.1200, lng: 72.8500 }, // ~7 km
      restaurantCoords: { lat: 19.0596, lng: 72.8295 },
    });
    assert.ok(farResult.pricing.deliveryFee > 40, 'Far distance should have fee greater than ₹40');

    // Order total >= 500: Free delivery
    const highValueItems = [{ productId: 'test-2', name: 'Pizza Party Box', price: 600, quantity: 1 }];
    const freeDeliveryResult = calculateOrderPricing(highValueItems, null, {
      customerCoords: { lat: 19.1200, lng: 72.8500 },
      restaurantCoords: { lat: 19.0596, lng: 72.8295 },
    });
    assert.equal(freeDeliveryResult.pricing.deliveryFee, 0, 'Orders >= ₹500 must receive FREE delivery');
  });

  // 2. Address API Controller Tests
  const testUserId = `user_maps_test_${Date.now()}`;
  let createdAddressId = null;

  await t.test('3. Address controller validates input and rejects incomplete data', async () => {
    const req = {
      user: { id: testUserId },
      body: {
        // Missing fullName and phone
        addressLine: 'Some Street',
      },
    };
    const res = createMockRes();
    await createAddress(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.success, false);
    assert.ok(res.jsonData.message.includes('required'));
  });

  await t.test('4. Address controller creates address with coordinates and details', async () => {
    const req = {
      user: { id: testUserId },
      body: {
        fullName: 'Prasham Jain',
        phone: '9876543210',
        label: 'Home',
        tag: 'Home',
        houseNumber: 'A-402',
        apartment: 'Sunshine Heights',
        landmark: 'Near Linking Road',
        addressLine: 'A-402, Sunshine Heights, Linking Road',
        fullAddress: 'A-402, Sunshine Heights, Linking Road, Bandra West, Mumbai 400050',
        area: 'Bandra West',
        city: 'Mumbai',
        pincode: '400050',
        placeId: 'ChIJde6...',
        coordinates: { lat: 19.0607, lng: 72.8362 },
        isDefault: true,
      },
    };
    const res = createMockRes();
    await createAddress(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.jsonData.success, true);
    assert.ok(res.jsonData.address);
    createdAddressId = res.jsonData.address._id;

    assert.equal(res.jsonData.address.houseNumber, 'A-402');
    assert.equal(res.jsonData.address.coordinates.lat, 19.0607);
    assert.equal(res.jsonData.address.coordinates.lng, 72.8362);
    assert.equal(res.jsonData.address.isDefault, true);
  });

  await t.test('5. Address controller fetches saved addresses for user', async () => {
    const req = { user: { id: testUserId } };
    const res = createMockRes();
    await getAddresses(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.jsonData.success, true);
    assert.ok(Array.isArray(res.jsonData.addresses));
    assert.ok(res.jsonData.addresses.length >= 1);
  });

  await t.test('6. Address controller updates address details and coordinates', async () => {
    const req = {
      user: { id: testUserId },
      params: { addressId: createdAddressId },
      body: {
        houseNumber: 'Penthouse 901',
        landmark: 'Opposite Starbucks',
        coordinates: { lat: 19.0615, lng: 72.8375 },
      },
    };
    const res = createMockRes();
    await updateAddress(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.jsonData.success, true);
    assert.equal(res.jsonData.address.houseNumber, 'Penthouse 901');
    assert.equal(res.jsonData.address.coordinates.lat, 19.0615);
  });

  await t.test('7. Address controller switches default address', async () => {
    const req = {
      user: { id: testUserId },
      params: { addressId: createdAddressId },
    };
    const res = createMockRes();
    await setDefaultAddress(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.jsonData.success, true);
    assert.equal(res.jsonData.address.isDefault, true);
  });

  // 3. Order Snapshot with Map Coordinates
  await t.test('8. Order creation preserves full delivery address snapshot with coordinates', async () => {
    const req = {
      user: { id: testUserId, name: 'Prasham Jain' },
      body: {
        items: [
          {
            productId: 'prod-burger',
            name: 'Crispy Veg Burger',
            price: 149,
            quantity: 2,
          },
        ],
        deliveryAddress: {
          fullName: 'Prasham Jain',
          phone: '9876543210',
          label: 'College',
          tag: 'College',
          houseNumber: 'Room 304, Campus Hostel',
          apartment: 'Main Tower',
          landmark: 'Gate 2',
          addressLine: 'Room 304, Campus Hostel, Main Tower',
          fullAddress: 'Room 304, Campus Hostel, Main Tower, Bandra West, Mumbai 400050',
          area: 'Bandra West',
          city: 'Mumbai',
          pincode: '400050',
          placeId: 'ChIJtest_place',
          coordinates: { lat: 19.0620, lng: 72.8390 },
        },
        paymentMethod: 'cod',
      },
    };
    const res = createMockRes();
    await createOrder(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.jsonData.success, true);
    const order = res.jsonData.order;
    assert.ok(order, 'Order must be created');

    // Verify address snapshot
    assert.equal(order.deliveryAddress.fullName, 'Prasham Jain');
    assert.equal(order.deliveryAddress.houseNumber, 'Room 304, Campus Hostel');
    assert.equal(order.deliveryAddress.tag, 'College');
    assert.ok(order.deliveryAddress.coordinates, 'Order snapshot must retain coordinates');
    assert.equal(order.deliveryAddress.coordinates.lat, 19.0620);
    assert.equal(order.deliveryAddress.coordinates.lng, 72.8390);

    // Verify route waypoints terminate at the customer destination
    assert.ok(order.demoRoute && Array.isArray(order.demoRoute.waypoints));
    const lastWaypoint = order.demoRoute.waypoints[order.demoRoute.waypoints.length - 1];
    assert.equal(lastWaypoint[0], 19.0620);
    assert.equal(lastWaypoint[1], 72.8390);
  });

  await t.test('9. Address controller deletes address safely', async () => {
    const req = {
      user: { id: testUserId },
      params: { addressId: createdAddressId },
    };
    const res = createMockRes();
    await deleteAddress(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.jsonData.success, true);
  });
});
