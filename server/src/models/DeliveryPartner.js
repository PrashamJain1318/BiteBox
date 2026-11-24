import mongoose from 'mongoose';

const deliveryPartnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide delivery partner name'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Please provide contact phone number'],
      trim: true,
    },
    vehicleType: {
      type: String,
      required: true,
      default: 'Motorcycle',
    },
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 4.8,
    },
    completedDeliveries: {
      type: Number,
      default: 0,
      min: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    currentOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxOrders: {
      type: Number,
      default: 3,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const DeliveryPartner = mongoose.model('DeliveryPartner', deliveryPartnerSchema);

/**
 * Standard fictional demo delivery partners (Masked demo numbers)
 */
export const INITIAL_DEMO_PARTNERS = [
  {
    _id: 'partner_rakesh_01',
    name: 'Rakesh Kumar',
    phone: '+91 98765 •••••',
    vehicleType: 'Hero Splendor Plus',
    vehicleNumber: 'KA-01-EA-4912',
    rating: 4.9,
    completedDeliveries: 1840,
    isAvailable: true,
    currentOrders: 0,
    maxOrders: 3,
    isActive: true,
  },
  {
    _id: 'partner_rahul_02',
    name: 'Rahul Sharma',
    phone: '+91 98765 •••••',
    vehicleType: 'Ather 450X (EV)',
    vehicleNumber: 'KA-03-EB-9124',
    rating: 4.8,
    completedDeliveries: 1210,
    isAvailable: true,
    currentOrders: 0,
    maxOrders: 3,
    isActive: true,
  },
  {
    _id: 'partner_amit_03',
    name: 'Amit Verma',
    phone: '+91 98765 •••••',
    vehicleType: 'TVS Raider 125',
    vehicleNumber: 'KA-05-MJ-3382',
    rating: 4.7,
    completedDeliveries: 950,
    isAvailable: true,
    currentOrders: 0,
    maxOrders: 3,
    isActive: true,
  },
  {
    _id: 'partner_karan_04',
    name: 'Karan Singh',
    phone: '+91 98765 •••••',
    vehicleType: 'Ola S1 Pro (EV)',
    vehicleNumber: 'KA-02-EV-7719',
    rating: 4.9,
    completedDeliveries: 2150,
    isAvailable: true,
    currentOrders: 0,
    maxOrders: 3,
    isActive: true,
  },
  {
    _id: 'partner_vikram_05',
    name: 'Vikram Patel',
    phone: '+91 98765 •••••',
    vehicleType: 'Honda Activa 6G',
    vehicleNumber: 'KA-04-TR-5021',
    rating: 4.8,
    completedDeliveries: 1480,
    isAvailable: true,
    currentOrders: 0,
    maxOrders: 3,
    isActive: true,
  },
  {
    _id: 'partner_suresh_06',
    name: 'Suresh Yadav',
    phone: '+91 98765 •••••',
    vehicleType: 'Bajaj Pulsar 150',
    vehicleNumber: 'KA-51-AB-6644',
    rating: 4.6,
    completedDeliveries: 830,
    isAvailable: true,
    currentOrders: 0,
    maxOrders: 3,
    isActive: true,
  },
];

// In-memory fallback delivery partners store
export let fallbackDeliveryPartners = JSON.parse(JSON.stringify(INITIAL_DEMO_PARTNERS));

/**
 * Seed or verify demo delivery partners in MongoDB
 */
export const seedDeliveryPartners = async () => {
  try {
    if (mongoose.connection.readyState !== 1) return;

    const count = await DeliveryPartner.countDocuments();
    if (count === 0) {
      console.log('🌱 Seeding 6 initial demo delivery partners into MongoDB...');
      // Strip mock string IDs so MongoDB generates valid ObjectIds
      const partnersToInsert = INITIAL_DEMO_PARTNERS.map(({ _id: _mockId, ...partner }) => partner);
      await DeliveryPartner.insertMany(partnersToInsert);
      console.log('✅ Demo delivery partners seeded successfully.');
    }
  } catch (error) {
    console.warn('⚠️ seedDeliveryPartners warning:', error.message);
  }
};
