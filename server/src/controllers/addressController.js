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
 * Normalize and sanitize an address object so frontend and backend field names agree
 */
export const normalizeAddress = (raw, fallbackUser = null) => {
  if (!raw) return null;
  const fullName = String(
    raw.fullName || raw.recipientName || fallbackUser?.name || 'Customer'
  ).trim();
  const phone = String(raw.phone || '').trim();
  const label = raw.label || raw.tag || 'Home';
  const tag = ['Home', 'Work', 'College', 'Other'].includes(label) ? label : 'Home';
  const houseNumber = String(raw.houseNumber || '').trim();
  const apartment = String(raw.apartment || '').trim();
  const landmark = String(raw.landmark || '').trim();

  let addressLine = String(raw.addressLine || raw.address || '').trim();
  if (!addressLine) {
    if (houseNumber || apartment) {
      addressLine = `${houseNumber}${apartment ? `, ${apartment}` : ''}`.trim();
    } else {
      addressLine = String(raw.fullAddress || '').trim();
    }
  }

  const fullAddress = String(
    raw.fullAddress ||
    `${addressLine}${raw.area ? `, ${raw.area}` : ''}${raw.city ? `, ${raw.city}` : ''}`
  ).trim();

  // Infer area, city, pincode if missing
  let area = String(raw.area || '').trim();
  let city = String(raw.city || 'Mumbai').trim();
  let state = String(raw.state || 'Maharashtra').trim();
  let pincode = String(raw.pincode || '').trim();

  if (!pincode && fullAddress) {
    const pinMatch = fullAddress.match(/\b\d{6}\b/);
    if (pinMatch) pincode = pinMatch[0];
  }

  if (!area && fullAddress) {
    const parts = fullAddress.split(',').map((p) => p.trim());
    if (parts.length >= 3) {
      area = parts[parts.length - 2];
    } else if (parts.length >= 2) {
      area = parts[0];
    }
  }

  const coordinates =
    raw.coordinates &&
    typeof raw.coordinates.lat === 'number' &&
    typeof raw.coordinates.lng === 'number'
      ? {
          lat: Number(raw.coordinates.lat),
          lng: Number(raw.coordinates.lng),
        }
      : undefined;

  return {
    _id: raw._id ? raw._id.toString() : raw.id,
    user: raw.user ? raw.user.toString() : 'guest_demo',
    label: tag,
    tag,
    fullName,
    recipientName: fullName,
    phone,
    houseNumber,
    apartment,
    landmark,
    addressLine,
    address: addressLine,
    fullAddress: fullAddress || `${addressLine}, ${area}, ${city} - ${pincode}`,
    area: area || 'Locality',
    city: city || 'Mumbai',
    state: state || 'Maharashtra',
    pincode: pincode || '400050',
    placeId: String(raw.placeId || '').trim(),
    coordinates,
    isDefault: Boolean(raw.isDefault),
    createdAt: raw.createdAt || new Date(),
    updatedAt: raw.updatedAt || new Date(),
  };
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
    let rawAddresses = [];

    if (isDbConnected()) {
      rawAddresses = await Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
    } else {
      rawAddresses = fallbackAddresses.filter(
        (a) => a.user.toString() === userId || userId === 'guest_demo'
      );
    }

    const addresses = rawAddresses.map((a) => normalizeAddress(a, req.user));

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
      tag,
      fullName,
      recipientName,
      fullAddress,
      addressLine,
      address,
      houseNumber,
      apartment,
      landmark,
      phone,
      area,
      city,
      state,
      pincode,
      placeId,
      coordinates,
      isDefault,
    } = req.body;

    // Field-specific validation
    const resolvedName = String(fullName || recipientName || '').trim();
    if (!resolvedName) {
      return res.status(400).json({
        success: false,
        message: 'Recipient name is required.',
        field: 'recipientName',
      });
    }

    const cleanPhone = String(phone || '').trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'A valid 10-digit contact phone number is required.',
        field: 'phone',
      });
    }

    const resolvedAddressLine = String(
      addressLine || address || houseNumber || fullAddress || ''
    ).trim();
    if (!resolvedAddressLine) {
      return res.status(400).json({
        success: false,
        message: 'Street or house address is required.',
        field: 'address',
      });
    }

    const resolvedArea = String(area || '').trim();
    if (!resolvedArea && !fullAddress) {
      return res.status(400).json({
        success: false,
        message: 'Locality or delivery area is required.',
        field: 'area',
      });
    }

    let resolvedPin = String(pincode || '').trim().replace(/\D/g, '');
    if (!resolvedPin && fullAddress) {
      const match = fullAddress.match(/\b\d{6}\b/);
      if (match) resolvedPin = match[0];
    }

    if (!resolvedPin || resolvedPin.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'A valid 6-digit Indian PIN code is required.',
        field: 'pincode',
      });
    }

    let coordCheck = { valid: true, lat: 19.0607, lng: 72.8362 };
    if (coordinates) {
      coordCheck = validateCoordinates(coordinates);
      if (!coordCheck.valid) {
        return res.status(400).json({
          success: false,
          message: coordCheck.message,
          field: 'coordinates',
        });
      }
    }

    const validLabels = ['Home', 'Work', 'College', 'Other'];
    const chosenTag = label || tag || 'Home';
    const sanitizedLabel = validLabels.includes(chosenTag) ? chosenTag : 'Home';
    const shouldBeDefault = Boolean(isDefault);

    const resolvedFullAddress = String(
      fullAddress ||
      `${resolvedAddressLine}, ${resolvedArea || 'Locality'}, ${city || 'Mumbai'} - ${resolvedPin}`
    ).trim();

    if (isDbConnected()) {
      // If setting as default, clear any existing default for this user
      if (shouldBeDefault) {
        await Address.updateMany({ user: userId }, { $set: { isDefault: false } });
      }

      const createdDoc = await Address.create({
        user: userId,
        label: sanitizedLabel,
        tag: sanitizedLabel,
        fullName: resolvedName,
        recipientName: resolvedName,
        addressLine: resolvedAddressLine,
        address: resolvedAddressLine,
        fullAddress: resolvedFullAddress,
        houseNumber: (houseNumber || '').trim(),
        apartment: (apartment || '').trim(),
        landmark: (landmark || '').trim(),
        phone: cleanPhone,
        area: resolvedArea || 'Locality',
        city: (city || 'Mumbai').trim(),
        state: (state || 'Maharashtra').trim(),
        pincode: resolvedPin,
        placeId: (placeId || '').trim(),
        coordinates: {
          lat: coordCheck.lat,
          lng: coordCheck.lng,
        },
        isDefault: shouldBeDefault,
      });

      const rawAll = await Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
      const allAddresses = rawAll.map((a) => normalizeAddress(a, req.user));

      return res.status(201).json({
        success: true,
        message: 'Delivery address saved successfully.',
        address: normalizeAddress(createdDoc, req.user),
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
      tag: sanitizedLabel,
      fullName: resolvedName,
      recipientName: resolvedName,
      addressLine: resolvedAddressLine,
      address: resolvedAddressLine,
      fullAddress: resolvedFullAddress,
      houseNumber: (houseNumber || '').trim(),
      apartment: (apartment || '').trim(),
      landmark: (landmark || '').trim(),
      phone: cleanPhone,
      area: resolvedArea || 'Locality',
      city: (city || 'Mumbai').trim(),
      state: (state || 'Maharashtra').trim(),
      pincode: resolvedPin,
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

    const userAddresses = fallbackAddresses
      .filter((a) => a.user.toString() === userId)
      .map((a) => normalizeAddress(a, req.user));

    return res.status(201).json({
      success: true,
      message: 'Delivery address saved successfully.',
      address: normalizeAddress(fallbackDoc, req.user),
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
      tag,
      fullName,
      recipientName,
      fullAddress,
      addressLine,
      address: altAddress,
      houseNumber,
      apartment,
      landmark,
      phone,
      area,
      city,
      state,
      pincode,
      placeId,
      coordinates,
      isDefault,
    } = req.body;

    let targetDoc = null;
    if (isDbConnected()) {
      targetDoc = await Address.findById(addressId);
      if (!targetDoc) {
        return res.status(404).json({ success: false, message: 'Address not found.' });
      }

      if (
        targetDoc.user.toString() !== userId &&
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
        targetDoc.coordinates = { lat: coordCheck.lat, lng: coordCheck.lng };
      }

      const chosenTag = label || tag;
      if (chosenTag) {
        targetDoc.label = chosenTag;
        targetDoc.tag = chosenTag;
      }
      if (fullName || recipientName) {
        targetDoc.fullName = (fullName || recipientName).trim();
        targetDoc.recipientName = targetDoc.fullName;
      }
      if (addressLine || altAddress) {
        targetDoc.addressLine = (addressLine || altAddress).trim();
        targetDoc.address = targetDoc.addressLine;
      }
      if (fullAddress) targetDoc.fullAddress = fullAddress.trim();
      if (houseNumber !== undefined) targetDoc.houseNumber = houseNumber.trim();
      if (apartment !== undefined) targetDoc.apartment = apartment.trim();
      if (landmark !== undefined) targetDoc.landmark = landmark.trim();
      if (phone) targetDoc.phone = phone.trim();
      if (area) targetDoc.area = area.trim();
      if (city) targetDoc.city = city.trim();
      if (state) targetDoc.state = state.trim();
      if (pincode) targetDoc.pincode = pincode.trim();
      if (placeId !== undefined) targetDoc.placeId = placeId.trim();

      if (isDefault !== undefined) {
        if (isDefault) {
          await Address.updateMany(
            { user: userId, _id: { $ne: addressId } },
            { $set: { isDefault: false } }
          );
        }
        targetDoc.isDefault = Boolean(isDefault);
      }

      await targetDoc.save();
      const rawAll = await Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
      const allAddresses = rawAll.map((a) => normalizeAddress(a, req.user));

      return res.status(200).json({
        success: true,
        message: 'Delivery address updated successfully.',
        address: normalizeAddress(targetDoc, req.user),
        addresses: allAddresses,
      });
    }

    // In-memory fallback
    targetDoc = fallbackAddresses.find((a) => a._id === addressId);
    if (!targetDoc) {
      return res.status(404).json({ success: false, message: 'Address not found.' });
    }

    if (
      targetDoc.user.toString() !== userId &&
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
      targetDoc.coordinates = { lat: coordCheck.lat, lng: coordCheck.lng };
    }

    const chosenTag = label || tag;
    if (chosenTag) {
      targetDoc.label = chosenTag;
      targetDoc.tag = chosenTag;
    }
    if (fullName || recipientName) {
      targetDoc.fullName = (fullName || recipientName).trim();
      targetDoc.recipientName = targetDoc.fullName;
    }
    if (addressLine || altAddress) {
      targetDoc.addressLine = (addressLine || altAddress).trim();
      targetDoc.address = targetDoc.addressLine;
    }
    if (fullAddress) targetDoc.fullAddress = fullAddress.trim();
    if (houseNumber !== undefined) targetDoc.houseNumber = houseNumber.trim();
    if (apartment !== undefined) targetDoc.apartment = apartment.trim();
    if (landmark !== undefined) targetDoc.landmark = landmark.trim();
    if (phone) targetDoc.phone = phone.trim();
    if (area) targetDoc.area = area.trim();
    if (city) targetDoc.city = city.trim();
    if (state) targetDoc.state = state.trim();
    if (pincode) targetDoc.pincode = pincode.trim();
    if (placeId !== undefined) targetDoc.placeId = placeId.trim();

    if (isDefault !== undefined) {
      if (isDefault) {
        fallbackAddresses.forEach((a) => {
          if (a.user.toString() === userId && a._id !== addressId) a.isDefault = false;
        });
      }
      targetDoc.isDefault = Boolean(isDefault);
    }

    targetDoc.updatedAt = new Date();
    const userAddresses = fallbackAddresses
      .filter((a) => a.user.toString() === userId)
      .map((a) => normalizeAddress(a, req.user));

    return res.status(200).json({
      success: true,
      message: 'Delivery address updated successfully.',
      address: normalizeAddress(targetDoc, req.user),
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
      const rawAll = await Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
      const remaining = rawAll.map((a) => normalizeAddress(a, req.user));

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
    const remaining = fallbackAddresses
      .filter((a) => a.user.toString() === userId)
      .map((a) => normalizeAddress(a, req.user));

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

      const rawAll = await Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
      const allAddresses = rawAll.map((a) => normalizeAddress(a, req.user));

      return res.status(200).json({
        success: true,
        message: 'Address set as default successfully.',
        addresses: allAddresses,
        address: normalizeAddress(address, req.user),
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

    const userAddresses = fallbackAddresses
      .filter((a) => a.user.toString() === userId)
      .map((a) => normalizeAddress(a, req.user));

    return res.status(200).json({
      success: true,
      message: 'Address set as default successfully.',
      addresses: userAddresses,
      address: normalizeAddress(address, req.user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to set default address.',
      error: error.message,
    });
  }
};
