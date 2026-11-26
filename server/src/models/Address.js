import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.Mixed, // Supports ObjectId and guest string ID
      required: true,
      index: true,
    },
    label: {
      type: String,
      enum: ['Home', 'Work', 'College', 'Other'],
      default: 'Home',
    },
    fullAddress: {
      type: String,
      required: [true, 'Please provide the complete street address'],
      trim: true,
    },
    houseNumber: {
      type: String,
      trim: true,
      default: '',
    },
    apartment: {
      type: String,
      trim: true,
      default: '',
    },
    landmark: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      required: [true, 'Please provide a contact phone number'],
      trim: true,
    },
    placeId: {
      type: String,
      default: '',
      trim: true,
    },
    coordinates: {
      lat: {
        type: Number,
        required: [true, 'Valid latitude coordinate is required'],
        min: [-90, 'Latitude must be >= -90'],
        max: [90, 'Latitude must be <= 90'],
      },
      lng: {
        type: Number,
        required: [true, 'Valid longitude coordinate is required'],
        min: [-180, 'Longitude must be >= -180'],
        max: [180, 'Longitude must be <= 180'],
      },
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Address = mongoose.model('Address', addressSchema);

// In-memory fallback addresses store for offline dev and test resilience
export let fallbackAddresses = [
  {
    _id: 'demo-addr-1',
    user: 'guest_demo',
    label: 'Home',
    fullAddress: 'A-402, Sunshine Heights, Linking Road, Bandra West, Mumbai 400050',
    houseNumber: 'Flat 402',
    apartment: 'Sunshine Heights',
    landmark: 'Opposite National College',
    phone: '9876543210',
    placeId: 'ChIJwe1EZjDG5zsRaYxSdYDsAUI',
    coordinates: {
      lat: 19.0607,
      lng: 72.8362,
    },
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: 'demo-addr-2',
    user: 'guest_demo',
    label: 'Work',
    fullAddress: 'Tech Hub Office, 7th Floor, BKC Avenue, Bandra Kurla Complex, Mumbai 400051',
    houseNumber: '7th Floor, Unit 702',
    apartment: 'Tech Hub Towers',
    landmark: 'Near Diamond Bourse',
    phone: '9876543210',
    placeId: 'ChIJ513ceGlP5zsR8fnN13M0BAU',
    coordinates: {
      lat: 19.0657,
      lng: 72.8687,
    },
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
