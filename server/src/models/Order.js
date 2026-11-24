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
    deliveryPartner: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'DeliveryPartner',
      default: null,
      index: true,
    },
    deliveryPartnerAssignedAt: {
      type: Date,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        note: {
          type: String,
        },
      },
    ],
    estimatedDeliveryMinutes: {
      type: Number,
      default: 30,
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
  },
  {
    timestamps: true,
  }
);

export const Order = mongoose.model('Order', orderSchema);
