import mongoose from 'mongoose';
import { Address, fallbackAddresses } from '../models/Address.js';

const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * Helper to get active user ID from request
 */
const getUserId = (req) => {
  if (req.user) {
    return (req.user._id || req.user.id || req.user).toString();
  }
  return req.query.userId || req.body.userId || 'guest_demo';
};

/**
 * Validate geographical coordinate bounds
 */
const validateCoordinates = (coords) => {
  if (!coords || typeof coords !== 'object') {
    return { valid: false, message: 'Coordinates object with lat and lng is required.' };
  }
  const lat = Number(coords.lat);
  const lng = Number(coords.lng);

  if (Number.isNaN(lat) || lat < -90 || lat > 90) {
    return { valid: false, message: 'Latitude must be a valid number between -90 and 90.' };
  }
  if (Number.isNaN(lng) || lng < -180 || lng > 180) {
    return { valid: false, message: 'Longitude must be a valid number between -180 and 180.' };
  }
  return { valid: true, lat, lng };
};

/**
 * @desc    Get all saved delivery addresses for authenticated user
 * @route   GET /api/v1/addresses
 * @access  Private / Optional Auth
 */
export const getAddresses = async (req, res) => {
  try {
    const userId = getUserId(req);
    let addresses = [];

    if (isDbConnected()) {
      addresses = await Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
    } else {
      addresses = fallbackAddresses.filter(
        (a) => a.user.toString() === userId || userId === 'guest_demo'
      );
    }

    return res.status(200).json({
      success: true,
      count: addresses.length,
      addresses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve delivery addresses.',
      error: error.message,
    });
  }
};

/**
 * @desc    Create a new saved delivery address
 * @route   POST /api/v1/addresses
 * @access  Private / Optional Auth
 */
export const createAddress = async (req, res) => {
  try {
    const userId = getUserId(req);
    const {
      label,
      fullAddress,
      houseNumber,
      apartment,
      landmark,
      phone,
      placeId,
      coordinates,
      isDefault,
    } = req.body;

    if (!fullAddress || typeof fullAddress !== 'string' || !fullAddress.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Full street address is required.',
      });
    }

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Contact phone number is required.',
      });
    }

    const coordCheck = validateCoordinates(coordinates);
    if (!coordCheck.valid) {
      return res.status(400).json({
        success: false,
        message: coordCheck.message,
      });
    }

    const validLabels = ['Home', 'Work', 'College', 'Other'];
    const sanitizedLabel = validLabels.includes(label) ? label : 'Home';
    const shouldBeDefault = Boolean(isDefault);

    if (isDbConnected()) {
      // If setting as default, clear any existing default for this user
      if (shouldBeDefault) {
        await Address.updateMany({ user: userId }, { $set: { isDefault: false } });
      }

      const newAddress = await Address.create({
        user: userId,
        label: sanitizedLabel,
        fullAddress: fullAddress.trim(),
        houseNumber: (houseNumber || '').trim(),
        apartment: (apartment || '').trim(),
        landmark: (landmark || '').trim(),
        phone: phone.trim(),
        placeId: (placeId || '').trim(),
        coordinates: {
          lat: coordCheck.lat,
          lng: coordCheck.lng,
        },
        isDefault: shouldBeDefault,
      });

      const allAddresses = await Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });

      return res.status(201).json({
        success: true,
        message: 'Delivery address saved successfully.',
        address: newAddress,
        addresses: allAddresses,
      });
    }

    // In-memory fallback
    if (shouldBeDefault) {
      fallbackAddresses.forEach((a) => {
        if (a.user.toString() === userId) a.isDefault = false;
      });
    }

    const fallbackDoc = {
      _id: `addr-${Date.now()}`,
      user: userId,
      label: sanitizedLabel,
      fullAddress: fullAddress.trim(),
      houseNumber: (houseNumber || '').trim(),
      apartment: (apartment || '').trim(),
      landmark: (landmark || '').trim(),
      phone: phone.trim(),
      placeId: (placeId || '').trim(),
      coordinates: {
        lat: coordCheck.lat,
        lng: coordCheck.lng,
      },
      isDefault: shouldBeDefault,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    fallbackAddresses.unshift(fallbackDoc);

    const userAddresses = fallbackAddresses.filter((a) => a.user.toString() === userId);

    return res.status(201).json({
      success: true,
      message: 'Delivery address saved successfully.',
      address: fallbackDoc,
      addresses: userAddresses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to save delivery address.',
      error: error.message,
    });
  }
};

/**
 * @desc    Update an existing delivery address
 * @route   PUT /api/v1/addresses/:addressId
 * @access  Private / Optional Auth
 */
export const updateAddress = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { addressId } = req.params;
    const {
      label,
      fullAddress,
      houseNumber,
      apartment,
      landmark,
      phone,
      placeId,
      coordinates,
      isDefault,
    } = req.body;

    let address = null;
    if (isDbConnected()) {
      address = await Address.findById(addressId);
      if (!address) {
        return res.status(404).json({ success: false, message: 'Address not found.' });
      }

      // Security: user can only modify their own address unless admin
      if (
        address.user.toString() !== userId &&
        req.user?.role !== 'admin' &&
        userId !== 'guest_demo'
      ) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this delivery address.',
        });
      }

      if (coordinates) {
        const coordCheck = validateCoordinates(coordinates);
        if (!coordCheck.valid) {
          return res.status(400).json({ success: false, message: coordCheck.message });
        }
        address.coordinates = { lat: coordCheck.lat, lng: coordCheck.lng };
      }

      if (label) address.label = label;
      if (fullAddress) address.fullAddress = fullAddress.trim();
      if (houseNumber !== undefined) address.houseNumber = houseNumber.trim();
      if (apartment !== undefined) address.apartment = apartment.trim();
      if (landmark !== undefined) address.landmark = landmark.trim();
      if (phone) address.phone = phone.trim();
      if (placeId !== undefined) address.placeId = placeId.trim();

      if (isDefault !== undefined) {
        if (isDefault) {
          await Address.updateMany(
            { user: userId, _id: { $ne: addressId } },
            { $set: { isDefault: false } }
          );
        }
        address.isDefault = Boolean(isDefault);
      }

      await address.save();
      const allAddresses = await Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });

      return res.status(200).json({
        success: true,
        message: 'Delivery address updated successfully.',
        address,
        addresses: allAddresses,
      });
    }

    // In-memory fallback
    address = fallbackAddresses.find((a) => a._id === addressId);
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found.' });
    }

    if (
      address.user.toString() !== userId &&
      req.user?.role !== 'admin' &&
      userId !== 'guest_demo'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this delivery address.',
      });
    }

    if (coordinates) {
      const coordCheck = validateCoordinates(coordinates);
      if (!coordCheck.valid) {
        return res.status(400).json({ success: false, message: coordCheck.message });
      }
      address.coordinates = { lat: coordCheck.lat, lng: coordCheck.lng };
    }

    if (label) address.label = label;
    if (fullAddress) address.fullAddress = fullAddress.trim();
    if (houseNumber !== undefined) address.houseNumber = houseNumber.trim();
    if (apartment !== undefined) address.apartment = apartment.trim();
    if (landmark !== undefined) address.landmark = landmark.trim();
    if (phone) address.phone = phone.trim();
    if (placeId !== undefined) address.placeId = placeId.trim();

    if (isDefault !== undefined) {
      if (isDefault) {
        fallbackAddresses.forEach((a) => {
          if (a.user.toString() === userId && a._id !== addressId) a.isDefault = false;
        });
      }
      address.isDefault = Boolean(isDefault);
    }

    address.updatedAt = new Date();
    const userAddresses = fallbackAddresses.filter((a) => a.user.toString() === userId);

    return res.status(200).json({
      success: true,
      message: 'Delivery address updated successfully.',
      address,
      addresses: userAddresses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update delivery address.',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete a delivery address
 * @route   DELETE /api/v1/addresses/:addressId
 * @access  Private / Optional Auth
 */
export const deleteAddress = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { addressId } = req.params;

    if (isDbConnected()) {
      const address = await Address.findById(addressId);
      if (!address) {
        return res.status(404).json({ success: false, message: 'Address not found.' });
      }

      if (
        address.user.toString() !== userId &&
        req.user?.role !== 'admin' &&
        userId !== 'guest_demo'
      ) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this delivery address.',
        });
      }

      await Address.findByIdAndDelete(addressId);
      const remaining = await Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });

      return res.status(200).json({
        success: true,
        message: 'Address deleted successfully.',
        addresses: remaining,
      });
    }

    // In-memory fallback
    const idx = fallbackAddresses.findIndex((a) => a._id === addressId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Address not found.' });
    }

    const addr = fallbackAddresses[idx];
    if (
      addr.user.toString() !== userId &&
      req.user?.role !== 'admin' &&
      userId !== 'guest_demo'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this delivery address.',
      });
    }

    fallbackAddresses.splice(idx, 1);
    const remaining = fallbackAddresses.filter((a) => a.user.toString() === userId);

    return res.status(200).json({
      success: true,
      message: 'Address deleted successfully.',
      addresses: remaining,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete delivery address.',
      error: error.message,
    });
  }
};

/**
 * @desc    Set a delivery address as default
 * @route   PATCH /api/v1/addresses/:addressId/default
 * @access  Private / Optional Auth
 */
export const setDefaultAddress = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { addressId } = req.params;

    if (isDbConnected()) {
      const address = await Address.findById(addressId);
      if (!address) {
        return res.status(404).json({ success: false, message: 'Address not found.' });
      }

      if (
        address.user.toString() !== userId &&
        req.user?.role !== 'admin' &&
        userId !== 'guest_demo'
      ) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this address.',
        });
      }

      await Address.updateMany({ user: userId }, { $set: { isDefault: false } });
      address.isDefault = true;
      await address.save();

      const allAddresses = await Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });

      return res.status(200).json({
        success: true,
        message: 'Address set as default successfully.',
        addresses: allAddresses,
        address,
      });
    }

    // In-memory fallback
    const address = fallbackAddresses.find((a) => a._id === addressId);
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found.' });
    }

    if (
      address.user.toString() !== userId &&
      req.user?.role !== 'admin' &&
      userId !== 'guest_demo'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this address.',
      });
    }

    fallbackAddresses.forEach((a) => {
      if (a.user.toString() === userId) a.isDefault = false;
    });
    address.isDefault = true;

    const userAddresses = fallbackAddresses.filter((a) => a.user.toString() === userId);

    return res.status(200).json({
      success: true,
      message: 'Address set as default successfully.',
      addresses: userAddresses,
      address,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to set default address.',
      error: error.message,
    });
  }
};
