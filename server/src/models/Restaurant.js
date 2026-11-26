import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  desc: { type: String },
  img: { type: String },
  isVeg: { type: Boolean, default: false },
  type: { type: String, default: 'veg' },
  restaurantId: { type: String },
  restaurantName: { type: String },
});

const restaurantSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    city: {
      type: String,
      required: true,
      index: true,
    },
    citySlug: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    state: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      default: 'India',
    },
    cuisine: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    rating: {
      type: Number,
      default: 4.4,
    },
    totalRatings: {
      type: String,
      default: '1.2K+ ratings',
    },
    deliveryTime: {
      type: String,
      default: '25-30 mins',
    },
    deliveryMinutes: {
      type: Number,
      default: 28,
    },
    startingPrice: {
      type: Number,
      default: 149,
    },
    costForTwo: {
      type: String,
      default: '₹350 for two',
    },
    location: {
      type: String,
      required: true,
    },
    distance: {
      type: String,
      default: '2.4 km',
    },
    offer: {
      type: String,
      default: '50% OFF UPTO ₹100',
    },
    isPureVeg: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    deliveryRadiusKm: {
      type: Number,
      default: 10,
    },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    image: {
      type: String,
      required: true,
    },
    isDemoData: {
      type: Boolean,
      default: true,
    },
    menu: [menuItemSchema],
  },
  {
    timestamps: true,
  }
);

// Compound index for high performance city queries
restaurantSchema.index({ citySlug: 1, isActive: 1, isAvailable: 1 });

export const Restaurant =
  mongoose.models.Restaurant || mongoose.model('Restaurant', restaurantSchema);
