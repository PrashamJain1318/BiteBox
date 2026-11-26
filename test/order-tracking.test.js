import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSimulationSchedule,
  evaluateOrderTracking,
  interpolateRoutePosition,
  DEMO_ASSIGNMENT_MIN_SECONDS,
  DEMO_ASSIGNMENT_MAX_SECONDS,
  DEMO_DELIVERY_MIN_SECONDS,
  DEMO_DELIVERY_MAX_SECONDS,
  DEFAULT_DEMO_ROUTE,
} from '../server/src/utils/deliverySimulator.js';
import {
  DEMO_PARTNERS_POOL,
  assignDeliveryPartner,
  releaseDeliveryPartner,
} from '../server/src/models/DeliveryPartner.js';
import {
  createOrder,
  getOrderTracking,
  demoAdvanceOrder,
} from '../server/src/controllers/orderController.js';

test('BiteBox Order Tracking & Delivery Simulation Test Suite', async (t) => {
  // 1. Simulation Schedule Generation
  await t.test('1. Simulation schedule generates valid assignment and delivery durations', () => {
    const placedAt = new Date();
    const schedule = createSimulationSchedule(placedAt);

    assert.ok(
      schedule.assignmentDurationSeconds >= DEMO_ASSIGNMENT_MIN_SECONDS &&
        schedule.assignmentDurationSeconds <= DEMO_ASSIGNMENT_MAX_SECONDS,
      `Assignment duration ${schedule.assignmentDurationSeconds} should be between ${DEMO_ASSIGNMENT_MIN_SECONDS} and ${DEMO_ASSIGNMENT_MAX_SECONDS}`
    );

    assert.ok(
      schedule.totalDeliveryDurationSeconds >= DEMO_DELIVERY_MIN_SECONDS &&
        schedule.totalDeliveryDurationSeconds <= DEMO_DELIVERY_MAX_SECONDS,
      `Total duration ${schedule.totalDeliveryDurationSeconds} should be between ${DEMO_DELIVERY_MIN_SECONDS} and ${DEMO_DELIVERY_MAX_SECONDS}`
    );

    const expectedEst = new Date(
      placedAt.getTime() + schedule.totalDeliveryDurationSeconds * 1000
    );
    assert.equal(
      schedule.estimatedDeliveryAt.getTime(),
      expectedEst.getTime()
    );
    assert.equal(schedule.demoSimulation, true);
    assert.ok(schedule.demoRoute.waypoints.length >= 4);
  });

  // 2. Delivery Partner Pool Size
  await t.test('2. Delivery partner pool has at least 8 unique demo partners', () => {
    assert.ok(DEMO_PARTNERS_POOL.length >= 8, 'Pool must contain at least 8 partners');
    const names = new Set(DEMO_PARTNERS_POOL.map((p) => p.name));
    assert.equal(names.size, DEMO_PARTNERS_POOL.length, 'All demo partners must have unique names');

    DEMO_PARTNERS_POOL.forEach((p) => {
      assert.ok(p.name, 'Partner must have a name');
      assert.ok(p.phone, 'Partner must have a phone');
      assert.ok(p.vehicle, 'Partner must have a vehicle');
      assert.ok(p.rating >= 4.0, 'Partner rating must be high');
      assert.ok(p.completedDeliveries >= 1000, 'Partner must have completed delivery stats');
    });
  });

  // 3. Fair Random Assignment & Partner Diversity
  await t.test('3. Different orders receive different delivery partners', async () => {
    const partner1 = await assignDeliveryPartner('test-order-A');
    const partner2 = await assignDeliveryPartner('test-order-B');

    assert.ok(partner1 && partner1.name);
    assert.ok(partner2 && partner2.name);
    assert.notEqual(
      partner1.name,
      partner2.name,
      'Consecutive assignments should rotate and prefer different available partners'
    );

    // Clean up
    await releaseDeliveryPartner('test-order-A');
    await releaseDeliveryPartner('test-order-B');
  });

  // 4. Partner Release Mechanism
  await t.test('4. Releasing partner marks them available again for new orders', async () => {
    const partner = await assignDeliveryPartner('test-order-release');
    assert.ok(partner);
    await releaseDeliveryPartner('test-order-release');
    // Can assign again cleanly
    const nextPartner = await assignDeliveryPartner('test-order-next');
    assert.ok(nextPartner);
    await releaseDeliveryPartner('test-order-next');
  });

  // 5. Lifecycle Step 1: Order Placed (<15 seconds)
  await t.test('5. New order under 15s is in placed status with searching partner state', async () => {
    const order = {
      orderId: 'BB-TEST-STEP1',
      placedAt: new Date(Date.now() - 5000), // 5 seconds ago
      assignmentDurationSeconds: 18,
      totalDeliveryDurationSeconds: 540,
      orderStatus: 'placed',
      deliveryPartner: null,
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
    };

    const tracking = await evaluateOrderTracking(order);
    assert.equal(tracking.orderStatus, 'placed');
    assert.equal(tracking.deliveryPartner, null);
    assert.ok(tracking.remainingSeconds > 500);
  });

  // 6. Lifecycle Step 2: Order Confirmed (>=18 seconds, partner assigned)
  await t.test('6. Order moves to confirmed and assigns delivery partner after 15-20s window', async () => {
    const order = {
      orderId: 'BB-TEST-STEP2',
      placedAt: new Date(Date.now() - 25000), // 25 seconds ago
      assignmentDurationSeconds: 18,
      totalDeliveryDurationSeconds: 540,
      orderStatus: 'placed',
      deliveryPartner: null,
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
    };

    const tracking = await evaluateOrderTracking(order);
    assert.equal(tracking.orderStatus, 'confirmed');
    assert.ok(tracking.deliveryPartner);
    assert.ok(tracking.deliveryPartner.name);
    assert.ok(tracking.deliveryPartner.phone);

    await releaseDeliveryPartner('BB-TEST-STEP2');
  });

  // 7. Lifecycle Step 3: Preparing Food (~60s to ~216s)
  await t.test('7. Order moves to preparing status while kitchen cooks', async () => {
    const order = {
      orderId: 'BB-TEST-STEP3',
      placedAt: new Date(Date.now() - 120000), // 120 seconds ago
      assignmentDurationSeconds: 18,
      totalDeliveryDurationSeconds: 540,
      orderStatus: 'confirmed',
      deliveryPartner: { name: 'Rahul Sharma', phone: '+91 98123 45678' },
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
    };

    const tracking = await evaluateOrderTracking(order);
    assert.equal(tracking.orderStatus, 'preparing');
    assert.ok(tracking.deliveryPartner);
  });

  // 8. Lifecycle Step 4: Out for Delivery (Rider Moving on Map)
  await t.test('8. Order moves to out_for_delivery and computes intermediate GPS coordinates', async () => {
    const order = {
      orderId: 'BB-TEST-STEP4',
      placedAt: new Date(Date.now() - 360000), // 360 seconds into a 540s delivery (~66% total time)
      assignmentDurationSeconds: 18,
      totalDeliveryDurationSeconds: 540,
      orderStatus: 'preparing',
      deliveryPartner: { name: 'Amit Verma', phone: '+91 98234 56789' },
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
    };

    const tracking = await evaluateOrderTracking(order);
    assert.equal(tracking.orderStatus, 'out_for_delivery');
    assert.ok(tracking.simulationProgress > 0 && tracking.simulationProgress < 1);
    assert.ok(tracking.currentLocation.lat);
    assert.ok(tracking.currentLocation.lng);
  });

  // 9. Lifecycle Step 5: Delivered (Timer Reaches Total Duration)
  await t.test('9. Order reaches delivered at scheduled completion and records deliveryCompletedAt', async () => {
    const order = {
      orderId: 'BB-TEST-STEP5',
      placedAt: new Date(Date.now() - 550000), // 550s ago > 540s
      assignmentDurationSeconds: 18,
      totalDeliveryDurationSeconds: 540,
      orderStatus: 'out_for_delivery',
      deliveryPartner: { name: 'Karan Mehta', phone: '+91 98456 78901' },
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
    };

    const tracking = await evaluateOrderTracking(order);
    assert.equal(tracking.orderStatus, 'delivered');
    assert.equal(tracking.simulationProgress, 1);
    assert.equal(tracking.remainingSeconds, 0);
    assert.ok(tracking.deliveryCompletedAt);
    // Preserves COD unpaid status
    assert.equal(tracking.paymentStatus, 'unpaid');

    await releaseDeliveryPartner('BB-TEST-STEP5');
  });

  // 10. Route Interpolation Math
  await t.test('10. interpolateRoutePosition interpolates accurately between route waypoints', () => {
    const waypoints = DEFAULT_DEMO_ROUTE.waypoints;
    const startLoc = interpolateRoutePosition(waypoints, 0.0);
    const midLoc = interpolateRoutePosition(waypoints, 0.5);
    const endLoc = interpolateRoutePosition(waypoints, 1.0);

    assert.equal(startLoc.lat, waypoints[0][0]);
    assert.equal(startLoc.lng, waypoints[0][1]);

    const lastIdx = waypoints.length - 1;
    assert.equal(endLoc.lat, waypoints[lastIdx][0]);
    assert.equal(endLoc.lng, waypoints[lastIdx][1]);

    assert.notEqual(midLoc.lat, startLoc.lat);
    assert.notEqual(midLoc.lat, endLoc.lat);
  });

  // 11. Saved Timestamps & Refresh Invariance
  await t.test('11. Refreshing order does not reset the countdown timer', async () => {
    const placedAt = new Date(Date.now() - 60000); // 60s ago
    const totalDeliveryDurationSeconds = 500;
    const estimatedDeliveryAt = new Date(placedAt.getTime() + totalDeliveryDurationSeconds * 1000);

    const order = {
      orderId: 'BB-REFRESH-TEST',
      placedAt,
      estimatedDeliveryAt,
      assignmentDurationSeconds: 18,
      totalDeliveryDurationSeconds,
      orderStatus: 'confirmed',
      deliveryPartner: { name: 'Sandeep Patel' },
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
    };

    // First call
    const t1 = await evaluateOrderTracking(order);
    // Simulated second call 2 seconds later
    const t2 = await evaluateOrderTracking({
      ...order,
      orderStatus: t1.orderStatus,
      deliveryPartner: t1.deliveryPartner,
    });

    assert.ok(t1.remainingSeconds <= 440 && t1.remainingSeconds >= 438);
    assert.ok(t2.remainingSeconds <= 440 && t2.remainingSeconds >= 438);
    assert.equal(t1.orderId, t2.orderId);
  });

  // 12. Cancelled Order Stops Progression
  await t.test('12. Cancelled order halts simulation progress and remains cancelled', async () => {
    const order = {
      orderId: 'BB-CANCEL-TEST',
      placedAt: new Date(Date.now() - 700000), // Long ago
      assignmentDurationSeconds: 18,
      totalDeliveryDurationSeconds: 540,
      orderStatus: 'cancelled',
      deliveryPartner: null,
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
    };

    const tracking = await evaluateOrderTracking(order);
    assert.equal(tracking.orderStatus, 'cancelled');
    assert.equal(tracking.simulationProgress, 0);
  });

  // 13. Controller createOrder includes simulation schedule
  await t.test('13. createOrder controller attaches simulation schedule and demo route to new COD order', async () => {
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
        items: [{ productId: 'item-1', name: 'Burger Feast', price: 299, quantity: 2 }],
        deliveryAddress: {
          fullName: 'Prasham Test',
          phone: '9876543210',
          addressLine: 'Flat 401, Lotus Palms',
          area: 'Koramangala',
          city: 'Bengaluru',
          pincode: '560034',
        },
        paymentMethod: 'cod',
      },
      user: { id: 'test_user_track' },
    };

    await createOrder(mockReq, mockRes);

    assert.equal(responseStatus, 201);
    assert.equal(responseJson.success, true);
    assert.ok(responseJson.order.orderId);
    assert.equal(responseJson.order.orderStatus, 'placed');
    assert.equal(responseJson.order.paymentMethod, 'cod');
    assert.equal(responseJson.order.paymentStatus, 'unpaid');
    assert.ok(responseJson.order.estimatedDeliveryAt);
    assert.ok(responseJson.order.assignmentDurationSeconds >= 15);
    assert.ok(responseJson.order.totalDeliveryDurationSeconds >= 480);
    assert.ok(responseJson.order.demoRoute.waypoints.length > 0);
  });

  // 14. Controller getOrderTracking endpoint
  await t.test('14. getOrderTracking controller returns 200 and telemetry payload', async () => {
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

    // First create an order to track
    let createdOrderId = null;
    const createRes = {
      status() {
        return this;
      },
      json(d) {
        createdOrderId = d.order.orderId;
        return this;
      },
    };

    await createOrder(
      {
        body: {
          items: [{ productId: 'item-track', name: 'Pizza Meal', price: 399, quantity: 1 }],
          deliveryAddress: {
            fullName: 'Live Tracker',
            phone: '9876543210',
            addressLine: '12th Main Road',
            area: 'Indiranagar',
            city: 'Bengaluru',
            pincode: '560038',
          },
          paymentMethod: 'cod',
        },
      },
      createRes
    );

    const mockTrackReq = {
      params: { id: createdOrderId },
    };

    await getOrderTracking(mockTrackReq, mockRes);

    assert.equal(responseStatus, 200);
    assert.equal(responseJson.success, true);
    assert.equal(responseJson.data.orderId, createdOrderId);
    assert.ok(responseJson.data.orderStatus);
    assert.ok(responseJson.data.route);
    assert.ok(responseJson.data.currentLocation);
  });

  // 15. Controller demoAdvanceOrder endpoint (Testing Fast-forward)
  await t.test('15. demoAdvanceOrder allows jumping through all 5 demo stages', async () => {
    let createdOrderId = null;
    const createRes = {
      status() {
        return this;
      },
      json(d) {
        createdOrderId = d.order.orderId;
        return this;
      },
    };

    await createOrder(
      {
        body: {
          items: [{ productId: 'item-demo', name: 'Dum Biryani', price: 280, quantity: 1 }],
          deliveryAddress: {
            fullName: 'Demo Tester',
            phone: '9876543210',
            addressLine: 'Plot 88',
            area: 'HSR Layout',
            city: 'Bengaluru',
            pincode: '560102',
          },
          paymentMethod: 'cod',
        },
      },
      createRes
    );

    const testAdvance = async (targetStatus) => {
      let status = null;
      let json = null;
      const res = {
        status(c) {
          status = c;
          return this;
        },
        json(d) {
          json = d;
          return this;
        },
      };
      await demoAdvanceOrder({ params: { id: createdOrderId }, body: { targetStatus } }, res);
      return { status, json };
    };

    // Advance to confirmed
    const resConf = await testAdvance('confirmed');
    assert.equal(resConf.status, 200);
    assert.equal(resConf.json.data.orderStatus, 'confirmed');
    assert.ok(resConf.json.data.deliveryPartner);

    // Advance to preparing
    const resPrep = await testAdvance('preparing');
    assert.equal(resPrep.status, 200);
    assert.equal(resPrep.json.data.orderStatus, 'preparing');

    // Advance to out_for_delivery
    const resOut = await testAdvance('out_for_delivery');
    assert.equal(resOut.status, 200);
    assert.equal(resOut.json.data.orderStatus, 'out_for_delivery');

    // Advance to delivered
    const resDeliv = await testAdvance('delivered');
    assert.equal(resDeliv.status, 200);
    assert.equal(resDeliv.json.data.orderStatus, 'delivered');
    assert.equal(resDeliv.json.data.paymentStatus, 'unpaid'); // COD unpaid preservation

    // Reset back to placed
    const resReset = await testAdvance('reset');
    assert.equal(resReset.status, 200);
    assert.equal(resReset.json.data.orderStatus, 'placed');
    assert.equal(resReset.json.data.deliveryPartner, null);
  });
});
