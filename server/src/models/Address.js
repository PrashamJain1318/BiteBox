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
    tag: {
      type: String,
      enum: ['Home', 'Work', 'College', 'Other'],
      default: 'Home',
    },
    fullName: {
      type: String,
      trim: true,
      default: '',
    },
    recipientName: {
      type: String,
      trim: true,
      default: '',
    },
    addressLine: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
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
    area: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      default: 'Mumbai',
    },
    state: {
      type: String,
      trim: true,
      default: 'Maharashtra',
    },
    pincode: {
      type: String,
      trim: true,
      default: '',
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
    tag: 'Home',
    fullName: 'Prasham Jain',
    recipientName: 'Prasham Jain',
    phone: '9876543210',
    addressLine: 'A-402, Sunshine Heights, Linking Road',
    address: 'A-402, Sunshine Heights, Linking Road',
    fullAddress: 'A-402, Sunshine Heights, Linking Road, Bandra West, Mumbai, Maharashtra 400050',
    houseNumber: 'Flat 402',
    apartment: 'Sunshine Heights',
    landmark: 'Opposite National College',
    area: 'Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050',
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
    tag: 'Work',
    fullName: 'Prasham Jain',
    recipientName: 'Prasham Jain',
    phone: '9876543210',
    addressLine: 'Tech Hub Office, 7th Floor, BKC Avenue',
    address: 'Tech Hub Office, 7th Floor, BKC Avenue',
    fullAddress: 'Tech Hub Office, 7th Floor, BKC Avenue, Bandra Kurla Complex, Mumbai, Maharashtra 400051',
    houseNumber: '7th Floor, Unit 702',
    apartment: 'Tech Hub Towers',
    landmark: 'Near Diamond Bourse',
    area: 'Bandra Kurla Complex',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400051',
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
