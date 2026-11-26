import mongoose from 'mongoose';

const deliveryPartnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    vehicle: {
      type: String,
      default: 'Scooter (Honda Activa)',
    },
    rating: {
      type: Number,
      default: 4.8,
      min: 1,
      max: 5,
    },
    completedDeliveries: {
      type: Number,
      default: 1200,
    },
    availability: {
      type: String,
      enum: ['available', 'busy', 'offline'],
      default: 'available',
      index: true,
    },
    currentOrderId: {
      type: String,
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const DeliveryPartner = mongoose.model('DeliveryPartner', deliveryPartnerSchema);

// Initial pool of at least 8 realistic demo delivery partners
export const DEMO_PARTNERS_POOL = [
  {
    id: 'partner-1',
    name: 'Ramesh Kumar',
    phone: '+91 98765 43210',
    vehicle: 'Honda Activa 6G',
    rating: 4.9,
    completedDeliveries: 2420,
    availability: 'available',
    currentOrderId: null,
  },
  {
    id: 'partner-2',
    name: 'Rahul Sharma',
    phone: '+91 98123 45678',
    vehicle: 'TVS Jupiter 125',
    rating: 4.85,
    completedDeliveries: 1850,
    availability: 'available',
    currentOrderId: null,
  },
  {
    id: 'partner-3',
    name: 'Amit Verma',
    phone: '+91 98234 56789',
    vehicle: 'Hero Splendor Plus',
    rating: 4.8,
    completedDeliveries: 1620,
    availability: 'available',
    currentOrderId: null,
  },
  {
    id: 'partner-4',
    name: 'Sandeep Patel',
    phone: '+91 98345 67890',
    vehicle: 'Bajaj Pulsar 150',
    rating: 4.75,
    completedDeliveries: 1390,
    availability: 'available',
    currentOrderId: null,
  },
  {
    id: 'partner-5',
    name: 'Karan Mehta',
    phone: '+91 98456 78901',
    vehicle: 'Ather 450X Electric',
    rating: 4.92,
    completedDeliveries: 2100,
    availability: 'available',
    currentOrderId: null,
  },
  {
    id: 'partner-6',
    name: 'Arjun Singh',
    phone: '+91 98567 89012',
    vehicle: 'Royal Enfield Hunter 350',
    rating: 4.88,
    completedDeliveries: 1750,
    availability: 'available',
    currentOrderId: null,
  },
  {
    id: 'partner-7',
    name: 'Vikram Rao',
    phone: '+91 98678 90123',
    vehicle: 'Suzuki Access 125',
    rating: 4.79,
    completedDeliveries: 1480,
    availability: 'available',
    currentOrderId: null,
  },
  {
    id: 'partner-8',
    name: 'Rohit Kumar',
    phone: '+91 98789 01234',
    vehicle: 'Ola S1 Pro Gen 2',
    rating: 4.82,
    completedDeliveries: 1950,
    availability: 'available',
    currentOrderId: null,
  },
];

// In-memory fallback delivery partners store
export let fallbackDeliveryPartners = DEMO_PARTNERS_POOL.map((p) => ({ ...p }));

/**
 * Seed delivery partners in MongoDB if empty
 */
export const seedDeliveryPartners = async () => {
  if (mongoose.connection.readyState !== 1) return;
  try {
    const count = await DeliveryPartner.countDocuments();
    if (count === 0) {
      const docs = DEMO_PARTNERS_POOL.map((p) => ({
        name: p.name,
        phone: p.phone,
        vehicle: p.vehicle,
        rating: p.rating,
        completedDeliveries: p.completedDeliveries,
        availability: 'available',
      }));
      await DeliveryPartner.insertMany(docs);
      console.log('✅ Seeded 8 demo delivery partners into MongoDB.');
    }
  } catch (err) {
    console.warn('⚠️ Delivery partner seeding notice:', err.message);
  }
};

/**
 * Fair random assignment algorithm:
 * 1. Find available partners (not assigned to active orders).
 * 2. Exclude the partner assigned to previous order if possible.
 * 3. Randomly select from eligible partners.
 * 4. Mark partner as busy with currentOrderId.
 */
let lastAssignedPartnerName = null;

export const assignDeliveryPartner = async (orderId) => {
  const isDb = mongoose.connection.readyState === 1;

  if (isDb) {
    try {
      // Find available partners not currently on active orders
      let available = await DeliveryPartner.find({
        availability: 'available',
        currentOrderId: null,
      });

      // If all partners are busy, release any stale orders or allow re-assignment
      if (!available || available.length === 0) {
        available = await DeliveryPartner.find();
      }

      if (available && available.length > 0) {
        // Exclude last assigned if multiple available
        let pool = available;
        if (available.length > 1 && lastAssignedPartnerName) {
          const filtered = available.filter((p) => p.name !== lastAssignedPartnerName);
          if (filtered.length > 0) pool = filtered;
        }

        // Random selection from pool
        const selected = pool[Math.floor(Math.random() * pool.length)];
        selected.availability = 'busy';
        selected.currentOrderId = orderId;
        selected.assignedAt = new Date();
        await selected.save();

        lastAssignedPartnerName = selected.name;

        return {
          id: selected._id.toString(),
          name: selected.name,
          phone: selected.phone,
          vehicle: selected.vehicle,
          rating: selected.rating,
          completedDeliveries: selected.completedDeliveries,
        };
      }
    } catch (err) {
      console.warn('⚠️ DB partner assignment warning, falling back to memory:', err.message);
    }
  }

  // In-memory fallback
  let available = fallbackDeliveryPartners.filter(
    (p) => p.availability === 'available' && !p.currentOrderId
  );
  if (available.length === 0) {
    // Reset all to available if all are busy
    fallbackDeliveryPartners.forEach((p) => {
      p.availability = 'available';
      p.currentOrderId = null;
    });
    available = fallbackDeliveryPartners;
  }

  let pool = available;
  if (available.length > 1 && lastAssignedPartnerName) {
    const filtered = available.filter((p) => p.name !== lastAssignedPartnerName);
    if (filtered.length > 0) pool = filtered;
  }

  const selected = pool[Math.floor(Math.random() * pool.length)];
  selected.availability = 'busy';
  selected.currentOrderId = orderId;
  selected.assignedAt = new Date();
  lastAssignedPartnerName = selected.name;

  return {
    id: selected.id || `partner-${Date.now()}`,
    name: selected.name,
    phone: selected.phone,
    vehicle: selected.vehicle,
    rating: selected.rating,
    completedDeliveries: selected.completedDeliveries,
  };
};

/**
 * Release delivery partner when order is delivered or cancelled
 */
export const releaseDeliveryPartner = async (orderId) => {
  const isDb = mongoose.connection.readyState === 1;
  if (isDb) {
    try {
      await DeliveryPartner.updateMany(
        { currentOrderId: orderId },
        { $set: { availability: 'available', currentOrderId: null } }
      );
    } catch (err) {
      console.warn('⚠️ Release partner DB warning:', err.message);
    }
  }

  fallbackDeliveryPartners.forEach((p) => {
    if (p.currentOrderId === orderId) {
      p.availability = 'available';
      p.currentOrderId = null;
    }
  });
};
