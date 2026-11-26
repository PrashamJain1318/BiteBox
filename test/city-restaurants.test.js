import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTED_CITIES, DEFAULT_CITY, matchSupportedCity } from '../src/data/cities.js';
import {
  getRestaurantsByCity,
  getRestaurantById,
  searchRestaurantsInCity,
} from '../src/data/multiCityRestaurants.js';
import { getCities, detectCity } from '../server/src/controllers/cityController.js';
import { getRestaurants } from '../server/src/controllers/restaurantController.js';
import { createOrder } from '../server/src/controllers/orderController.js';
import { validateCoupon, getAvailableCoupons } from '../server/src/controllers/couponController.js';
import { Coupon } from '../server/src/models/Coupon.js';

// Helper to mock express res object
const createMockRes = () => {
  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
  };
  return res;
};

describe('BiteBox Multi-City India Support & City Restaurant Filtering Test Suite', () => {
  // Test 1: All 11 initial supported Indian cities exist
  test('1. All 11 initial Indian cities are configured and supported', () => {
    assert.strictEqual(SUPPORTED_CITIES.length, 11);
    const expectedCities = [
      'indore',
      'ahmedabad',
      'mumbai',
      'nagpur',
      'delhi',
      'raipur',
      'neemuch',
      'kolkata',
      'bengaluru',
      'chennai',
      'hyderabad',
    ];
    for (const slug of expectedCities) {
      const found = SUPPORTED_CITIES.find((c) => c.slug === slug);
      assert.ok(found, `Expected city ${slug} to be in SUPPORTED_CITIES`);
      assert.strictEqual(found.country, 'India');
      assert.strictEqual(found.isActive, true);
      assert.ok(found.coordinates.lat !== undefined && found.coordinates.lng !== undefined);
      assert.ok(found.state && found.state.length > 0);
    }
  });

  // Test 2: Default city is Bengaluru
  test('2. Default city is configured to Bengaluru, Karnataka', () => {
    assert.strictEqual(DEFAULT_CITY.slug, 'bengaluru');
    assert.strictEqual(DEFAULT_CITY.name, 'Bengaluru');
    assert.strictEqual(DEFAULT_CITY.state, 'Karnataka');
  });

  // Test 3: matchSupportedCity matches direct names, slugs, and common aliases
  test('3. matchSupportedCity correctly normalizes city names and aliases', () => {
    assert.strictEqual(matchSupportedCity('Bengaluru')?.slug, 'bengaluru');
    assert.strictEqual(matchSupportedCity('bangalore')?.slug, 'bengaluru');
    assert.strictEqual(matchSupportedCity('bombay')?.slug, 'mumbai');
    assert.strictEqual(matchSupportedCity('New Delhi')?.slug, 'delhi');
    assert.strictEqual(matchSupportedCity('Indore')?.slug, 'indore');
    assert.strictEqual(matchSupportedCity('Neemuch')?.slug, 'neemuch');
    assert.strictEqual(matchSupportedCity('Nimach')?.slug, 'neemuch');
    assert.strictEqual(matchSupportedCity('Madras')?.slug, 'chennai');
    assert.strictEqual(matchSupportedCity('Calcutta')?.slug, 'kolkata');
    assert.strictEqual(matchSupportedCity('UnknownCityXYZ'), null);
  });

  // Test 4: City detection via coordinates near Indore
  test('4. POST /api/v1/cities/detect accurately detects city by GPS coordinates (Indore)', async () => {
    const req = {
      body: {
        latitude: 22.7196,
        longitude: 75.8577,
      },
    };
    const res = createMockRes();

    await detectCity(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.supported, true);
    assert.strictEqual(res.data.city.slug, 'indore');
    assert.strictEqual(res.data.city.name, 'Indore');
  });

  // Test 5: City detection via coordinates outside supported India coverage
  test('5. POST /api/v1/cities/detect flags unsupported locations with helpful message', async () => {
    const req = {
      body: {
        latitude: 35.6762, // Tokyo
        longitude: 139.6503,
      },
    };
    const res = createMockRes();

    await detectCity(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.supported, false);
    assert.ok(res.data.message.includes('not available'));
  });

  // Test 6: getCities controller returns all active supported cities
  test('6. GET /api/v1/cities returns all 11 supported cities with metadata', async () => {
    const req = { query: {} };
    const res = createMockRes();

    await getCities(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.count, 11);
    assert.ok(res.data.cities.some((c) => c.slug === 'indore'));
    assert.ok(res.data.cities.some((c) => c.slug === 'ahmedabad'));
  });

  // Test 7: Restaurant dataset has restaurants for all 11 cities
  test('7. Multi-city dataset contains restaurants for every single supported city', () => {
    for (const city of SUPPORTED_CITIES) {
      const rests = getRestaurantsByCity(city.slug);
      assert.ok(
        rests.length > 0,
        `City ${city.name} (${city.slug}) should have at least 1 demo restaurant`
      );
      for (const r of rests) {
        assert.strictEqual(r.citySlug, city.slug);
        assert.ok(r.menu && r.menu.length > 0);
        assert.ok(r.coordinates.lat && r.coordinates.lng);
      }
    }
  });

  // Test 8: Indore query returns ONLY Indore restaurants
  test('8. getRestaurantsByCity("indore") strictly excludes cross-city restaurants', () => {
    const indoreRests = getRestaurantsByCity('indore');
    assert.ok(indoreRests.length >= 2);
    assert.ok(indoreRests.some((r) => r.name.includes('Sarafa')));
    assert.ok(indoreRests.every((r) => r.citySlug === 'indore'));
    assert.strictEqual(indoreRests.filter((r) => r.citySlug === 'bengaluru').length, 0);
    assert.strictEqual(indoreRests.filter((r) => r.citySlug === 'mumbai').length, 0);
  });

  // Test 9: Ahmedabad query returns ONLY Ahmedabad restaurants
  test('9. getRestaurantsByCity("ahmedabad") returns authentic Ahmedabad food hubs', () => {
    const amdRests = getRestaurantsByCity('ahmedabad');
    assert.ok(amdRests.length >= 2);
    assert.ok(amdRests.some((r) => r.name.includes('Manek Chowk')));
    assert.ok(amdRests.every((r) => r.citySlug === 'ahmedabad'));
  });

  // Test 10: Restaurant Controller GET /api/v1/restaurants?city=indore
  test('10. GET /api/v1/restaurants?city=indore filters strictly via REST API', async () => {
    const req = { query: { city: 'indore' } };
    const res = createMockRes();

    await getRestaurants(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.city.slug, 'indore');
    assert.ok(res.data.restaurants.length >= 2);
    assert.ok(res.data.restaurants.every((r) => r.citySlug === 'indore'));
  });

  // Test 11: Restaurant Controller GET /api/v1/restaurants?city=mumbai&category=pizza
  test('11. Restaurant Controller filters by city AND category simultaneously', async () => {
    const req = { query: { city: 'mumbai', category: 'pizza' } };
    const res = createMockRes();

    await getRestaurants(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.restaurants.every((r) => r.citySlug === 'mumbai'));
  });

  // Test 12: Searching restaurants inside a city
  test('12. searchRestaurantsInCity searches only within the specified city boundaries', () => {
    const results = searchRestaurantsInCity('chaat', 'indore');
    assert.ok(results.length > 0);
    assert.ok(results.every((r) => r.citySlug === 'indore'));

    const noResults = searchRestaurantsInCity('NonExistentDish12345', 'indore');
    assert.strictEqual(noResults.length, 0);
  });

  // Test 13: Backward compatibility mapping for old restaurant IDs (r1 -> blr-r1)
  test('13. getRestaurantById maps legacy r1..r8 IDs to blr-r1..blr-r8 seamlessly', () => {
    const r1 = getRestaurantById('r1');
    assert.ok(r1, 'Legacy ID r1 should be resolved');
    assert.strictEqual(r1.name, 'Burger Boulevard');
    assert.strictEqual(r1.citySlug, 'bengaluru');

    const idrR1 = getRestaurantById('idr-r1');
    assert.ok(idrR1, 'Indore restaurant idr-r1 should be resolved');
    assert.strictEqual(idrR1.citySlug, 'indore');
  });

  // Test 14: Cross-city order creation is rejected if items are from different cities
  test('14. createOrder strictly rejects carts containing items from multiple cities', async () => {
    const req = {
      body: {
        items: [
          {
            productId: 'p1',
            name: 'Sarafa Garadu',
            price: 150,
            quantity: 1,
            restaurantCitySlug: 'indore',
          },
          {
            productId: 'p2',
            name: 'Koramangala Smash Burger',
            price: 250,
            quantity: 1,
            restaurantCitySlug: 'bengaluru',
          },
        ],
        deliveryAddress: {
          fullName: 'Prasham Jain',
          phone: '9876543210',
          addressLine: 'MG Road',
          area: 'Palasia',
          city: 'Indore',
          pincode: '452001',
        },
        paymentMethod: 'cod',
      },
    };
    const res = createMockRes();

    await createOrder(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    assert.ok(res.data.message.includes('multiple cities'));
  });

  // Test 15: Cross-city order creation rejected if delivery address city mismatches restaurant city
  test('15. createOrder strictly rejects order if delivery address city mismatches restaurant city', async () => {
    const req = {
      body: {
        items: [
          {
            productId: 'p1',
            name: 'Indore Poha & Jalebi',
            price: 120,
            quantity: 2,
            restaurantCitySlug: 'indore',
            restaurantCity: 'Indore',
          },
        ],
        deliveryAddress: {
          fullName: 'Prasham Jain',
          phone: '9876543210',
          addressLine: 'Linking Road, Bandra',
          area: 'Bandra West',
          city: 'Mumbai', // Address in Mumbai, but restaurant in Indore
          pincode: '400050',
        },
        paymentMethod: 'cod',
      },
    };
    const res = createMockRes();

    await createOrder(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    assert.ok(res.data.message.includes('Cross-city ordering is not supported'));
  });

  // Test 16: Valid same-city COD order succeeds and attaches accurate city coordinates
  test('16. createOrder succeeds for valid same-city order and configures city route', async () => {
    const req = {
      body: {
        items: [
          {
            productId: 'p1',
            name: 'Bhutte Ka Kees',
            price: 150,
            quantity: 2,
            restaurantName: 'Sarafa Night Chaat',
            restaurantCitySlug: 'indore',
            restaurantCity: 'Indore',
            restaurantCoords: { lat: 22.718, lng: 75.854 },
          },
        ],
        deliveryAddress: {
          fullName: 'Prasham Jain',
          phone: '9876543210',
          addressLine: '12 Palasia Square',
          area: 'Old Palasia',
          city: 'Indore',
          pincode: '452001',
          coordinates: { lat: 22.724, lng: 75.882 },
        },
        paymentMethod: 'cod',
      },
    };
    const res = createMockRes();

    await createOrder(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.order.paymentMethod, 'cod');
    assert.strictEqual(res.data.order.orderStatus, 'placed');
    assert.strictEqual(res.data.order.deliveryAddress.city, 'Indore');
    // Verify route is located in Indore coordinates, not Mumbai default
    assert.strictEqual(Number(res.data.order.demoRoute.restaurant.lat.toFixed(3)), 22.718);
  });

  // Test 17: City-specific coupon (INDORE20) accepted for Indore orders
  test('17. validateCoupon accepts city-specific coupon when order is in that city', async () => {
    const req = {
      body: {
        code: 'INDORE20',
        citySlug: 'indore',
        items: [{ id: 'p1', price: 300, quantity: 1, name: 'Sarafa Platter' }],
      },
    };
    const res = createMockRes();

    await validateCoupon(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.coupon.code, 'INDORE20');
    assert.strictEqual(res.data.pricing.discount, 60); // 20% of 300
  });

  // Test 18: City-specific coupon (INDORE20) rejected for Bengaluru/Mumbai orders
  test('18. validateCoupon rejects city-specific coupon when order is from a different city', async () => {
    const req = {
      body: {
        code: 'INDORE20',
        citySlug: 'bengaluru', // Trying to use Indore coupon in Bengaluru
        items: [{ id: 'p1', price: 300, quantity: 1, name: 'Dosa' }],
      },
    };
    const res = createMockRes();

    await validateCoupon(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    assert.ok(res.data.message.includes('only valid for orders in Indore'));
  });

  // Test 19: getAvailableCoupons filters available coupons by city parameter
  test('19. GET /api/v1/coupons/available?city=indore returns universal + Indore coupons', async () => {
    const req = { query: { city: 'indore' } };
    const res = createMockRes();

    await getAvailableCoupons(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    const codes = res.data.coupons.map((c) => c.code);
    assert.ok(codes.includes('INDORE20'));
    assert.ok(codes.includes('WELCOME10'));
    // Should NOT include coupons restricted to other cities like Mumbai or Bengaluru
    assert.strictEqual(codes.includes('MUMBAI30'), false);
    assert.strictEqual(codes.includes('BLR100'), false);
  });

  // Test 20: Coupon model isValidFor method validates city restriction
  test('20. Coupon.isValidFor method validates citySlug matching', () => {
    const indoreCoupon = new Coupon({
      code: 'INDORE20',
      description: 'Indore discount',
      discountType: 'percentage',
      discountValue: 20,
      minOrderValue: 200,
      citySlug: 'indore',
      isActive: true,
      expiryDate: new Date('2028-01-01'),
    });

    const validResult = indoreCoupon.isValidFor(250, 0, null, 'indore');
    assert.strictEqual(validResult.valid, true);

    const invalidResult = indoreCoupon.isValidFor(250, 0, null, 'mumbai');
    assert.strictEqual(invalidResult.valid, false);
    assert.ok(invalidResult.message.includes('only valid for orders in Indore'));
  });
});
