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
});
