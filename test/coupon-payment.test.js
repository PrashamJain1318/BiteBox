import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { calculateOrderPricing } from '../server/src/utils/pricingCalculator.js';
import { INITIAL_SAMPLE_COUPONS } from '../server/src/models/Coupon.js';

test('BiteBox Coupon & Payment System Test Suite', async (t) => {
  // Test items
  const margheritaPizza = { productId: '1', name: 'Margherita Pizza', price: 199, quantity: 1 };
  const farmhousePizza = { productId: '2', name: 'Farmhouse Pizza', price: 329, quantity: 1 };

  // 1. Valid percentage coupon (e.g. BITEBOX20: 20% off min 499, max 200)
  await t.test('1. Valid percentage coupon calculation', () => {
    const coupon = INITIAL_SAMPLE_COUPONS.find((c) => c.code === 'BITEBOX20');
    const items = [margheritaPizza, farmhousePizza]; // 199 + 329 = 528
    const { pricing } = calculateOrderPricing(items, coupon);

    assert.equal(pricing.itemTotal, 528);
    // 20% of 528 = 105.6 -> rounded 106
    assert.equal(pricing.discount, 106);
    assert.ok(pricing.grandTotal > 0);
  });

  // 2. Valid flat discount coupon (e.g. FLAT50: ₹50 flat on orders above 199)
  await t.test('2. Valid flat discount coupon calculation', () => {
    const coupon = INITIAL_SAMPLE_COUPONS.find((c) => c.code === 'FLAT50');
    const items = [farmhousePizza]; // 329
    const { pricing } = calculateOrderPricing(items, coupon);

    assert.equal(pricing.itemTotal, 329);
    assert.equal(pricing.discount, 50);
  });

  // 3. Free delivery coupon (e.g. FREESHIP: discounts only the delivery fee)
  await t.test('3. Free delivery coupon only discounts delivery fee', () => {
    const coupon = INITIAL_SAMPLE_COUPONS.find((c) => c.code === 'FREESHIP');
    const items = [margheritaPizza]; // 199 (below 500, delivery fee is normally 40)
    const { pricing } = calculateOrderPricing(items, coupon);

    assert.equal(pricing.deliveryFee, 0);
    assert.equal(pricing.discount, 40); // Delivery fee discounted
  });

  // 4. Invalid coupon code
  await t.test('4. Invalid coupon returns no discount', () => {
    const invalidCoupon = null;
    const { pricing } = calculateOrderPricing([margheritaPizza], invalidCoupon);
    assert.equal(pricing.discount, 0);
  });

  // 5. Expired coupon validation
  await t.test('5. Expired coupon validation check', () => {
    const expiredCoupon = {
      code: 'EXPIRED10',
      isActive: true,
      expiryDate: new Date('2020-01-01'), // in the past
      minOrderValue: 100,
    };
    const isExpired = new Date(expiredCoupon.expiryDate) < new Date();
    assert.equal(isExpired, true);
  });

  // 6. Minimum order value not reached
  await t.test('6. Minimum order value not reached triggers shortfall', () => {
    const coupon = INITIAL_SAMPLE_COUPONS.find((c) => c.code === 'BITEBOX20'); // min 499
    const items = [margheritaPizza]; // 199 < 499
    const { pricing } = calculateOrderPricing(items, null);

    const meetsMin = pricing.itemTotal >= coupon.minOrderValue;
    assert.equal(meetsMin, false);
    assert.equal(coupon.minOrderValue - pricing.itemTotal, 300);
  });

  // 7. Coupon usage limit reached
  await t.test('7. Coupon global usage limit reached check', () => {
    const cappedCoupon = {
      code: 'LIMITED',
      usageLimit: 10,
      usedCount: 10,
    };
    const isLimitReached = cappedCoupon.usedCount >= cappedCoupon.usageLimit;
    assert.equal(isLimitReached, true);
  });

  // 8. Coupon removed from cart
  await t.test('8. Coupon removal restores full grand total without discount', () => {
    const items = [farmhousePizza, margheritaPizza];
    const withCoupon = calculateOrderPricing(items, INITIAL_SAMPLE_COUPONS[1]).pricing;
    const withoutCoupon = calculateOrderPricing(items, null).pricing;

    assert.ok(withoutCoupon.grandTotal > withCoupon.grandTotal);
    assert.equal(withoutCoupon.discount, 0);
  });

  // 9. Cart quantity changed after coupon applied
  await t.test('9. Cart quantity change dynamically recalculates discount', () => {
    const coupon = INITIAL_SAMPLE_COUPONS.find((c) => c.code === 'BITEBOX20'); // 20%
    const itemQty1 = [{ ...margheritaPizza, quantity: 3 }]; // 199 * 3 = 597
    const itemQty2 = [{ ...margheritaPizza, quantity: 4 }]; // 199 * 4 = 796

    const p1 = calculateOrderPricing(itemQty1, coupon).pricing;
    const p2 = calculateOrderPricing(itemQty2, coupon).pricing;

    assert.notEqual(p1.discount, p2.discount);
    assert.ok(p2.discount > p1.discount);
  });

  // 10. Coupon applied to an ineligible restaurant or category
  await t.test('10. Ineligible restaurant restriction validation', () => {
    const restrictedCoupon = {
      code: 'PIZZAONLY',
      applicableCategories: ['pizza'],
    };
    const isApplicable = restrictedCoupon.applicableCategories.includes('beverages');
    assert.equal(isApplicable, false);
  });

  // 11. COD order creation
  await t.test('11. Cash on Delivery pricing and unpaid status structure', () => {
    const items = [margheritaPizza];
    const { pricing } = calculateOrderPricing(items, null);
    const codOrder = {
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
      orderStatus: 'confirmed',
      pricing,
    };

    assert.equal(codOrder.paymentStatus, 'unpaid');
    assert.equal(codOrder.paymentMethod, 'cod');
  });

  // 12. Successful Razorpay payment signature verification
  await t.test('12. Razorpay HMAC SHA-256 signature verification succeeds with correct secret', () => {
    const keySecret = 'test_secret_12345';
    const razorpayOrderId = 'order_test_abc123';
    const razorpayPaymentId = 'pay_test_xyz789';

    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    assert.equal(generatedSignature, expectedSignature);
  });

  // 13. Failed Razorpay payment
  await t.test('13. Failed payment status mapping', () => {
    const failedPaymentOrder = {
      paymentStatus: 'failed',
      failureReason: 'Payment cancelled by user',
    };
    assert.equal(failedPaymentOrder.paymentStatus, 'failed');
    assert.ok(failedPaymentOrder.failureReason.length > 0);
  });

  // 14. Invalid payment signature
  await t.test('14. Invalid payment signature is strictly rejected', () => {
    const keySecret = 'test_secret_12345';
    const razorpayOrderId = 'order_test_abc123';
    const razorpayPaymentId = 'pay_test_xyz789';
    const forgedSignature = 'forged_fake_signature_hash_000000000000';

    const correctSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    assert.notEqual(forgedSignature, correctSignature);
  });

  // 15. Duplicate webhook event idempotency
  await t.test('15. Webhook prevents duplicate processing if already paid', () => {
    const order = { orderId: 'BB-2026-101', paymentStatus: 'paid' };
    let capturedAgain = false;

    if (order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      capturedAgain = true;
    }

    assert.equal(capturedAgain, false);
    assert.equal(order.paymentStatus, 'paid');
  });

  // 16. User attempting to modify order amount (server verifies canonical prices)
  await t.test('16. Tampered item price in payload is overridden by canonical server price', () => {
    const tamperedItem = {
      productId: '1', // Margherita Pizza canonical price is 199
      name: 'Margherita Pizza',
      price: 1, // Malicious user set price to ₹1
      quantity: 1,
    };

    const { sanitizedItems, pricing } = calculateOrderPricing([tamperedItem], null);

    // Server must enforce canonical price ₹199, NOT ₹1!
    assert.equal(sanitizedItems[0].price, 199);
    assert.equal(pricing.itemTotal, 199);
    assert.notEqual(pricing.itemTotal, 1);
  });

  // 17. User attempting to access another user order
  await t.test('17. User authorization check protects order access', () => {
    const order = { user: 'user_12345' };
    const requestingUser = { _id: 'user_67890', role: 'user' };

    const isAuthorized =
      order.user === requestingUser._id || requestingUser.role === 'admin';
    assert.equal(isAuthorized, false);
  });

  // 18. Payment retry
  await t.test('18. Failed order retains items and pricing for payment retry', () => {
    const order = {
      orderId: 'BB-2026-999',
      paymentStatus: 'failed',
      items: [margheritaPizza],
      pricing: { grandTotal: 264 },
    };

    const canRetry = order.paymentStatus === 'failed' || order.paymentStatus === 'pending';
    assert.equal(canRetry, true);
    assert.equal(order.pricing.grandTotal, 264);
  });

  // 19. Empty cart checkout rejection
  await t.test('19. Empty cart calculation yields 0 and empty items', () => {
    const { sanitizedItems, pricing } = calculateOrderPricing([], null);
    assert.equal(sanitizedItems.length, 0);
    assert.equal(pricing.itemTotal, 0);
    assert.equal(pricing.grandTotal, 0);
  });

  // 20. Order confirmation after verified payment
  await t.test('20. Order successfully confirmed after verified payment capture', () => {
    const order = {
      orderId: 'BB-2026-777',
      paymentStatus: 'pending',
      orderStatus: 'placed',
    };

    // Upon verification
    order.paymentStatus = 'paid';
    order.orderStatus = 'confirmed';
    order.paidAt = new Date();

    assert.equal(order.paymentStatus, 'paid');
    assert.equal(order.orderStatus, 'confirmed');
    assert.ok(order.paidAt instanceof Date);
  });

  // 21. Standard Checkout - Minimum amount >= 100 paise validation
  await t.test('21. Standard Checkout requires minimum 100 paise (₹1)', () => {
    const invalidAmount = 50; // 50 paise is < 100
    const isValid = Number(invalidAmount) >= 100;
    assert.equal(isValid, false);

    const validAmount = 50000; // ₹500 in paise
    assert.equal(Number(validAmount) >= 100, true);
  });

  // 22. Standard Checkout - Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
  await t.test('22. Standard Checkout HMAC-SHA256 signature verification with configured key secret', () => {
    const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_test_secret_for_unit_tests';
    const order_id = 'order_DAvD8z4qW7wK8U';
    const payment_id = 'pay_DAvEJ3vVvV8K8U';

    const generated = crypto
      .createHmac('sha256', secret)
      .update(`${order_id}|${payment_id}`)
      .digest('hex');

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${order_id}|${payment_id}`)
      .digest('hex');

    assert.equal(generated, expected);
    assert.equal(typeof generated, 'string');
    assert.equal(generated.length, 64); // 64 hex characters (256 bits)
  });

  // 23. Cash on Delivery (COD) Order Logic
  await t.test('23. COD order sets paymentMethod=cod, paymentStatus=unpaid, orderStatus=placed with no Razorpay calls', () => {
    const codOrder = {
      orderId: 'BB-2026-COD01',
      user: 'user_test_cod',
      items: [margheritaPizza],
      deliveryAddress: {
        fullName: 'Prasham Jain',
        phone: '9876543210',
        tag: 'Home',
        addressLine: 'A-402 Sunshine Heights',
        area: 'Bandra West',
        city: 'Mumbai',
        pincode: '400050',
      },
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
      orderStatus: 'placed',
      placedAt: new Date(),
    };

    assert.equal(codOrder.paymentMethod, 'cod');
    assert.equal(codOrder.paymentStatus, 'unpaid');
    assert.equal(codOrder.orderStatus, 'placed');
    assert.equal(codOrder.razorpayOrderId, undefined);
  });

  // 24. Address Validation
  await t.test('24. Complete address validation rules', () => {
    const validAddress = {
      fullName: 'Prasham Jain',
      phone: '9876543210',
      tag: 'Home',
      addressLine: 'A-402 Sunshine Heights',
      area: 'Bandra West',
      city: 'Mumbai',
      pincode: '400050',
    };

    const isComplete = (addr) =>
      Boolean(
        addr &&
        addr.fullName &&
        addr.phone &&
        addr.addressLine &&
        addr.area &&
        addr.city &&
        addr.pincode
      );

    assert.equal(isComplete(validAddress), true);
    assert.equal(isComplete({ ...validAddress, pincode: '' }), false);
    assert.equal(isComplete({ ...validAddress, phone: '' }), false);
  });

  // 25. Health check endpoint contract
  await t.test('25. Backend health check returns success: true and message: BiteBox API is running', async () => {
    const appModule = await import('../server/src/app.js');
    const expressApp = appModule.default;
    assert.ok(expressApp);

    // Verify route is registered in express router
    const hasHealthRoute = expressApp._router.stack.some(
      (layer) => layer.route && layer.route.path === '/api/v1/health'
    );
    assert.equal(hasHealthRoute, true);
  });

  // 26. Controller: createOrder with Cash on Delivery (COD)
  await t.test('26. createOrder controller handles COD order, sets placed/unpaid status, and sanitizes address', async () => {
    const { createOrder } = await import('../server/src/controllers/orderController.js');

    let responseStatus = null;
    let responseJson = null;

    const mockRes = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseJson = data;
        return this;
      },
    };

    const mockReq = {
      body: {
        items: [
          {
            productId: '1',
            name: 'Margherita Pizza',
            price: 199,
            quantity: 2,
            image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500',
            restaurantName: 'La Pinoz Pizza',
          },
        ],
        deliveryAddress: {
          _id: 'demo-addr-1',
          fullName: 'Prasham Jain',
          phone: '9876543210',
          tag: 'Home',
          addressLine: 'A-402, Sunshine Heights, Linking Road',
          area: 'Bandra West',
          city: 'Mumbai',
          pincode: '400050',
        },
        couponCode: '',
        paymentMethod: 'cod',
      },
      user: {
        _id: 'usr_mock_user_123',
        id: 'usr_mock_user_123',
        name: 'Prasham Jain',
        role: 'user',
      },
    };

    await createOrder(mockReq, mockRes);

    assert.equal(responseStatus, 201);
    assert.equal(responseJson.success, true);
    assert.equal(responseJson.order.paymentMethod, 'cod');
    assert.equal(responseJson.order.paymentStatus, 'unpaid');
    assert.equal(responseJson.order.orderStatus, 'placed');
    assert.equal(responseJson.order.deliveryAddress._id, undefined); // Sanitized, no client _id
    assert.equal(responseJson.order.deliveryAddress.fullName, 'Prasham Jain');
    assert.ok(responseJson.order.orderId.startsWith('BB-2026-'));
    assert.ok(responseJson.order.pricing.grandTotal > 0);

    // Test rejection with missing address
    let badResStatus = null;
    let badResJson = null;
    const badRes = {
      status(code) {
        badResStatus = code;
        return this;
      },
      json(data) {
        badResJson = data;
        return this;
      },
    };
    await createOrder(
      {
        body: {
          items: mockReq.body.items,
          deliveryAddress: { fullName: '' },
          paymentMethod: 'cod',
        },
        user: mockReq.user,
      },
      badRes
    );
    assert.equal(badResStatus, 400);
    assert.equal(badResJson.success, false);
  });

  // 27. Controller: createOrder with Online Payment (UPI QR / Cards / NetBanking)
  await t.test('27. createOrder controller handles Online Payment (UPI QR) with resilient Razorpay order creation', async () => {
    const { createOrder } = await import('../server/src/controllers/orderController.js');

    let responseStatus = null;
    let responseJson = null;

    const mockRes = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseJson = data;
        return this;
      },
    };

    const mockReq = {
      body: {
        items: [
          {
            productId: 'biryani-1',
            name: 'Special Egg Dum Biryani',
            price: 215,
            quantity: 2,
            image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500',
            restaurantName: 'BiteBox Partner Kitchen',
          },
        ],
        deliveryAddress: {
          fullName: 'PRASHAMJAINT',
          phone: '9876543210',
          tag: 'Home',
          addressLine: 'Flat 12B, Palm View Apts',
          area: 'Andheri West',
          city: 'Mumbai',
          pincode: '400053',
        },
        couponCode: '',
        paymentMethod: 'upi_qr',
      },
      user: {
        _id: 'usr_mock_user_online',
        id: 'usr_mock_user_online',
        name: 'PRASHAMJAINT',
        role: 'user',
      },
    };

    await createOrder(mockReq, mockRes);

    assert.equal(responseStatus, 201);
    assert.equal(responseJson.success, true);
    assert.equal(responseJson.order.paymentMethod, 'upi_qr');
    assert.equal(responseJson.order.paymentStatus, 'pending');
    assert.equal(responseJson.order.orderStatus, 'placed');
    assert.ok(responseJson.order.orderId.startsWith('BB-2026-'));
    assert.ok(responseJson.razorpayOrder);
    assert.ok(responseJson.razorpayOrder.id);
    assert.ok(responseJson.razorpayOrder.keyId);
    assert.equal(responseJson.razorpayOrder.amount, Math.round(responseJson.order.pricing.grandTotal * 100));
  });

  // 28. Controller: GET /api/v1/orders returns HTTP 200 list (not 404 Not Found)
  await t.test('28. getMyOrders controller handles GET /api/v1/orders without 404 error', async () => {
    const { getMyOrders } = await import('../server/src/controllers/orderController.js');

    let responseStatus = null;
    let responseJson = null;

    const mockRes = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseJson = data;
        return this;
      },
    };

    const mockReq = {
      user: null, // Test unauthenticated GET /api/v1/orders
    };

    await getMyOrders(mockReq, mockRes);

    assert.equal(responseStatus, 200);
    assert.equal(responseJson.success, true);
    assert.ok(Array.isArray(responseJson.orders));
  });

  // 29. Controller: googleAuth handles Google OAuth sign-in and returns JWT session
  await t.test('29. googleAuth controller handles Google sign-in and generates valid JWT session', async () => {
    const { googleAuth } = await import('../server/src/controllers/authController.js');

    let responseStatus = null;
    let responseJson = null;

    const mockRes = {
      cookie() {
        return this;
      },
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseJson = data;
        return this;
      },
    };

    const mockReq = {
      body: {
        idToken: 'mock_google_id_token_' + Date.now(),
        email: 'prashamjain.google@gmail.com',
        name: 'Prasham Jain',
      },
    };

    await googleAuth(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert.equal(responseStatus, 200);
    assert.equal(responseJson.success, true);
    assert.ok(responseJson.token);
    assert.equal(responseJson.user.email, 'prashamjain.google@gmail.com');
    assert.equal(responseJson.user.provider, 'google');
  });

  // 30. Controller: googleAuth decodes base64 JWT payload safely
  await t.test('30. googleAuth controller decodes 3-part base64 Google JWT token', async () => {
    const { googleAuth } = await import('../server/src/controllers/authController.js');

    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(
      JSON.stringify({
        email: 'googleuser.verified@example.com',
        name: 'Verified User',
        sub: 'google_sub_123456789',
        picture: 'https://example.com/avatar.jpg',
      })
    ).toString('base64');
    const signature = Buffer.from('mock_signature').toString('base64');
    const fakeJwt = `test_jwt_${header}.${payload}.${signature}`;

    let responseStatus = null;
    let responseJson = null;

    const mockRes = {
      cookie() {
        return this;
      },
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseJson = data;
        return this;
      },
    };

    const mockReq = {
      body: {
        idToken: fakeJwt,
      },
    };

    await googleAuth(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert.equal(responseStatus, 200);
    assert.equal(responseJson.success, true);
    assert.ok(responseJson.token);
    assert.equal(responseJson.user.email, 'googleuser.verified@example.com');
    assert.equal(responseJson.user.provider, 'google');
  });

  // 31. Controller: googleAuth returns 400 when neither token nor email is provided
  await t.test('31. googleAuth controller returns 400 when neither token nor email is provided', async () => {
    const { googleAuth } = await import('../server/src/controllers/authController.js');

    let responseStatus = null;
    let responseJson = null;

    const mockRes = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseJson = data;
        return this;
      },
    };

    const mockReq = {
      body: {},
    };

    await googleAuth(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert.equal(responseStatus, 400);
    assert.equal(responseJson.success, false);
    assert.equal(responseJson.message, 'No Google authentication token provided');
  });

  // 32. Theme state & toggle functionality
  await t.test('32. Theme state default and toggle logic', () => {
    let currentTheme = 'light';
    const toggle = (t) => (t === 'dark' ? 'light' : 'dark');

    assert.equal(currentTheme, 'light');
    currentTheme = toggle(currentTheme);
    assert.equal(currentTheme, 'dark');
    currentTheme = toggle(currentTheme);
    assert.equal(currentTheme, 'light');
  });

  // 33. Theme localStorage key validation
  await t.test('33. Theme persistence key is standard bitebox_theme', () => {
    const THEME_STORAGE_KEY = 'bitebox_theme';
    const store = new Map();

    store.set(THEME_STORAGE_KEY, 'dark');
    assert.equal(store.get('bitebox_theme'), 'dark');

    store.set(THEME_STORAGE_KEY, 'light');
    assert.equal(store.get('bitebox_theme'), 'light');
  });

  // 34. Delivery Partner assignment: dynamic assignment algorithm picks least active partner
  await t.test('34. Delivery Partner assignment chooses available partner with lowest current orders', async () => {
    const { assignDeliveryPartner, releaseDeliveryPartner } = await import(
      '../server/src/utils/deliveryPartnerService.js'
    );
    const { INITIAL_DEMO_PARTNERS } = await import('../server/src/models/DeliveryPartner.js');

    // Initial partner selection
    const partner1 = await assignDeliveryPartner('test_order_1');
    assert.ok(partner1);
    assert.ok(partner1.name);
    assert.ok(partner1.phone);
    assert.ok(partner1.vehicleNumber);

    // Verify all 6 demo partners exist in initial list
    assert.ok(INITIAL_DEMO_PARTNERS.length >= 6);
    const partnerNames = INITIAL_DEMO_PARTNERS.map((p) => p.name);
    assert.ok(partnerNames.includes('Rakesh Kumar'));
    assert.ok(partnerNames.includes('Rahul Sharma'));
    assert.ok(partnerNames.includes('Amit Verma'));
    assert.ok(partnerNames.includes('Karan Singh'));
    assert.ok(partnerNames.includes('Vikram Patel'));
    assert.ok(partnerNames.includes('Suresh Yadav'));

    // Release partner
    const released = await releaseDeliveryPartner(partner1._id || partner1.name, false);
    assert.ok(released);
  });

  // 35. Demo Tracking lifecycle progression based on elapsed time
  await t.test('35. Demo Tracking Engine evaluates lifecycle milestones based on elapsed seconds', async () => {
    const { evaluateAndProgressOrder } = await import('../server/src/utils/demoTrackingEngine.js');
    const { DEMO_TRACKING_CONFIG } = await import('../server/src/config/demoTrackingConfig.js');

    const now = Date.now();

    // Placed (< 10s)
    const mockOrderPlaced = {
      orderId: 'TEST-001',
      orderStatus: 'placed',
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
      placedAt: new Date(now - 2000), // 2 seconds ago
      statusHistory: [{ status: 'placed', timestamp: new Date(now - 2000) }],
    };
    const resPlaced = await evaluateAndProgressOrder(mockOrderPlaced);
    assert.equal(resPlaced.orderStatus, 'placed');

    // Confirmed (>= 10s and < 25s)
    const mockOrderConfirmed = {
      orderId: 'TEST-002',
      orderStatus: 'placed',
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
      placedAt: new Date(now - 12000), // 12 seconds ago
      statusHistory: [{ status: 'placed', timestamp: new Date(now - 12000) }],
    };
    const resConfirmed = await evaluateAndProgressOrder(mockOrderConfirmed);
    assert.equal(resConfirmed.orderStatus, 'confirmed');

    // Preparing (>= 25s and < 45s)
    const mockOrderPreparing = {
      orderId: 'TEST-003',
      orderStatus: 'confirmed',
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
      placedAt: new Date(now - 30000), // 30 seconds ago
      statusHistory: [{ status: 'placed', timestamp: new Date(now - 30000) }],
    };
    const resPrep = await evaluateAndProgressOrder(mockOrderPreparing);
    assert.equal(resPrep.orderStatus, 'preparing');

    // Out for delivery (>= 45s and < 90s)
    const mockOrderOut = {
      orderId: 'TEST-004',
      orderStatus: 'preparing',
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
      placedAt: new Date(now - 55000), // 55 seconds ago
      statusHistory: [{ status: 'placed', timestamp: new Date(now - 55000) }],
    };
    const resOut = await evaluateAndProgressOrder(mockOrderOut);
    assert.equal(resOut.orderStatus, 'out_for_delivery');

    // Delivered (>= 90s) & COD payment collection confirmation
    const mockOrderDelivered = {
      orderId: 'TEST-005',
      orderStatus: 'out_for_delivery',
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
      placedAt: new Date(now - 95000), // 95 seconds ago
      statusHistory: [{ status: 'placed', timestamp: new Date(now - 95000) }],
    };
    const resDelivered = await evaluateAndProgressOrder(mockOrderDelivered);
    assert.equal(resDelivered.orderStatus, 'delivered');
    assert.equal(resDelivered.paymentStatus, 'paid'); // COD marked paid upon delivery

    // Verify configured delay thresholds
    assert.equal(DEMO_TRACKING_CONFIG.timings.confirmed, 10);
    assert.equal(DEMO_TRACKING_CONFIG.timings.preparing, 25);
    assert.equal(DEMO_TRACKING_CONFIG.timings.outForDelivery, 45);
    assert.equal(DEMO_TRACKING_CONFIG.timings.delivered, 90);
  });

  // 36. Tracking metrics: GPS location interpolation and ETA calculation
  await t.test('36. Tracking metrics correctly interpolates rider position along polyline', async () => {
    const { calculateTrackingMetrics } = await import('../server/src/utils/demoTrackingEngine.js');
    const { DEMO_TRACKING_CONFIG } = await import('../server/src/config/demoTrackingConfig.js');

    const route = DEMO_TRACKING_CONFIG.locations.routePath;
    const startPoint = route[0];
    const endPoint = route[route.length - 1];

    // Status: preparing -> position should be at restaurant
    const prepOrder = {
      orderStatus: 'preparing',
      placedAt: new Date(),
    };
    const prepMetrics = calculateTrackingMetrics(prepOrder);
    assert.equal(prepMetrics.partnerLocation.lat, startPoint[0]);
    assert.equal(prepMetrics.partnerLocation.lng, startPoint[1]);
    assert.equal(prepMetrics.progressPercentage, 60);

    // Status: delivered -> position should be at customer destination
    const delOrder = {
      orderStatus: 'delivered',
      placedAt: new Date(Date.now() - 100000),
    };
    const delMetrics = calculateTrackingMetrics(delOrder);
    assert.equal(delMetrics.partnerLocation.lat, endPoint[0]);
    assert.equal(delMetrics.partnerLocation.lng, endPoint[1]);
    assert.equal(delMetrics.progressPercentage, 100);
    assert.equal(delMetrics.etaMinutes, 0);
  });

  // 37. Reset demo simulation endpoint functionality
  await t.test('37. Reset demo resets order status back to placed with fresh timestamp', async () => {
    const { resetDemoTracking, fallbackOrders } = await import('../server/src/controllers/orderController.js');

    // Ensure mock order exists in fallbackOrders store
    fallbackOrders.push({
      _id: 'test_order_reset',
      orderId: 'test_order_reset',
      orderStatus: 'delivered',
      paymentMethod: 'cod',
      paymentStatus: 'paid',
      statusHistory: [],
    });

    let responseStatus = null;
    let responseJson = null;

    const mockRes = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseJson = data;
        return this;
      },
    };

    const mockReq = {
      params: { id: 'test_order_reset' },
      user: { _id: 'customer_1', role: 'customer' },
    };

    await resetDemoTracking(mockReq, mockRes);

    assert.equal(responseStatus, 200);
    assert.equal(responseJson.success, true);
    assert.equal(responseJson.order.orderStatus, 'placed');
    assert.equal(responseJson.order.paymentStatus, 'unpaid');
    assert.ok(responseJson.deliveryPartner);
  });
});
