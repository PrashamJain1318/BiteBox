import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    image: {
      type: String,
    },
    restaurantName: {
      type: String,
      default: 'BiteBox Partner Kitchen',
    },
    itemTotal: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const deliveryAddressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Please provide delivery recipient name'],
    },
    phone: {
      type: String,
      required: [true, 'Please provide delivery phone number'],
    },
    tag: {
      type: String,
      enum: ['Home', 'Work', 'Other'],
      default: 'Home',
    },
    addressLine: {
      type: String,
      required: [true, 'Please provide address line'],
    },
    area: {
      type: String,
      required: [true, 'Please provide locality / area'],
    },
    city: {
      type: String,
      required: [true, 'Please provide city'],
    },
    pincode: {
      type: String,
      required: [true, 'Please provide 6-digit postal code'],
    },
  },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    itemTotal: {
      type: Number,
      required: true,
    },
    packagingCharges: {
      type: Number,
      default: 25,
    },
    deliveryFee: {
      type: Number,
      default: 40,
    },
    taxes: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    items: [orderItemSchema],
    deliveryAddress: deliveryAddressSchema,
    coupon: {
      code: { type: String },
      discountAmount: { type: Number, default: 0 },
      discountType: { type: String },
    },
    pricing: {
      type: pricingSchema,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['upi_qr', 'upi_app', 'card', 'netbanking', 'cod'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'unpaid'],
      default: 'pending',
      index: true,
    },
    orderStatus: {
      type: String,
      enum: ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'placed',
      index: true,
    },
    razorpayOrderId: {
      type: String,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    failureReason: {
      type: String,
    },
    placedAt: {
      type: Date,
      default: Date.now,
    },
    paidAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    // Delivery Partner & Demo Simulation Fields
    deliveryPartner: {
      id: { type: String },
      name: { type: String },
      phone: { type: String },
      vehicle: { type: String },
      rating: { type: Number },
      completedDeliveries: { type: Number },
    },
    deliveryPartnerAssignedAt: {
      type: Date,
    },
    estimatedDeliveryAt: {
      type: Date,
    },
    deliveryCompletedAt: {
      type: Date,
    },
    assignmentDurationSeconds: {
      type: Number,
      default: 18,
    },
    totalDeliveryDurationSeconds: {
      type: Number,
      default: 540,
    },
    demoSimulation: {
      type: Boolean,
      default: true,
    },
    demoRoute: {
      restaurant: {
        name: { type: String, default: 'BiteBox Partner Kitchen' },
        lat: { type: Number, default: 12.9352 },
        lng: { type: Number, default: 77.6245 },
      },
      destination: {
        address: { type: String, default: 'Delivery Address' },
        lat: { type: Number, default: 12.9279 },
        lng: { type: Number, default: 77.6385 },
      },
      waypoints: {
        type: [[Number]],
        default: [
          [12.9352, 77.6245],
          [12.9338, 77.628],
          [12.9315, 77.632],
          [12.9298, 77.6355],
          [12.9279, 77.6385],
        ],
      },
    },
  },
  {
    timestamps: true,
  }
);

export const Order = mongoose.model('Order', orderSchema);
