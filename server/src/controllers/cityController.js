import mongoose from 'mongoose';
import { City, SUPPORTED_CITIES } from '../models/City.js';
import { calculateDistanceInKm } from '../utils/pricingCalculator.js';

const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * @desc    Get all supported cities in India
 * @route   GET /api/v1/cities
 * @access  Public
 */
export const getCities = async (req, res) => {
  try {
    let cities = [];

    if (isDbConnected()) {
      cities = await City.find({ isActive: true }).sort({ isPopular: -1, name: 1 });
      if (!cities.length) {
        cities = SUPPORTED_CITIES;
      }
    } else {
      cities = SUPPORTED_CITIES;
    }

    return res.status(200).json({
      success: true,
      count: cities.length,
      cities,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve supported cities.',
      error: err.message,
    });
  }
};

/**
 * @desc    Detect user city from GPS coordinates or reverse geocoded name
 * @route   POST /api/v1/cities/detect
 * @access  Public
 */
export const detectCity = async (req, res) => {
  try {
    const lat = req.body.lat !== undefined ? req.body.lat : req.body.latitude;
    const lng = req.body.lng !== undefined ? req.body.lng : req.body.longitude;
    const cityName = req.body.cityName || req.body.city;

    // 1. If explicit cityName provided from client reverse geocoding
    if (cityName && typeof cityName === 'string') {
      const cleanName = cityName.trim().toLowerCase();
      const matchedCity = SUPPORTED_CITIES.find(
        (c) =>
          c.name.toLowerCase() === cleanName ||
          c.slug === cleanName ||
          c.aliases.some((alias) => cleanName.includes(alias) || alias.includes(cleanName))
      );

      if (matchedCity) {
        return res.status(200).json({
          success: true,
          supported: true,
          isSupported: true,
          city: matchedCity,
          message: `Detected city: ${matchedCity.name}, ${matchedCity.state}`,
        });
      }

      return res.status(200).json({
        success: true,
        supported: false,
        isSupported: false,
        detectedCity: cityName,
        detectedCityName: cityName,
        message: 'BiteBox is not available in your city yet.',
        supportedCities: SUPPORTED_CITIES,
      });
    }

    // 2. If lat & lng provided, find closest supported city within service range (60 km)
    if (lat !== undefined && lng !== undefined) {
      const numericLat = Number(lat);
      const numericLng = Number(lng);

      if (!Number.isNaN(numericLat) && !Number.isNaN(numericLng)) {
        let nearestCity = null;
        let shortestDist = Infinity;

        SUPPORTED_CITIES.forEach((c) => {
          const dist = calculateDistanceInKm(
            numericLat,
            numericLng,
            c.coordinates.lat,
            c.coordinates.lng
          );
          if (dist < shortestDist) {
            shortestDist = dist;
            nearestCity = c;
          }
        });

        // If user is within 60 km radius of city center, consider them in that city
        if (nearestCity && shortestDist <= 60) {
          return res.status(200).json({
            success: true,
            supported: true,
            isSupported: true,
            distanceKm: Math.round(shortestDist * 10) / 10,
            city: nearestCity,
            message: `Detected nearby city: ${nearestCity.name}, ${nearestCity.state} (~${Math.round(shortestDist)} km away)`,
          });
        }

        return res.status(200).json({
          success: true,
          supported: false,
          isSupported: false,
          nearestCity: nearestCity?.name,
          nearestDistanceKm: Math.round(shortestDist),
          message: 'BiteBox is not available in your city yet.',
          supportedCities: SUPPORTED_CITIES,
        });
      }
    }

    return res.status(400).json({
      success: false,
      message: 'Please provide either GPS coordinates (lat, lng) or a city name.',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error detecting city location.',
      error: err.message,
    });
  }
};
