import mongoose from 'mongoose';
import { Restaurant } from '../models/Restaurant.js';
import { SUPPORTED_CITIES } from '../models/City.js';
import {
  ALL_CITIES_RESTAURANTS,
  getRestaurantById as findRestaurantById,
  searchRestaurantsInCity,
} from '../data/multiCityRestaurants.js';

const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * @desc    Get restaurants strictly filtered by city
 * @route   GET /api/v1/restaurants
 * @access  Public
 */
export const getRestaurants = async (req, res) => {
  try {
    const { city, citySlug, search, category, isPureVeg, sortBy } = req.query;
    const targetCitySlug = (citySlug || city || '').toLowerCase().trim();

    if (!targetCitySlug) {
      return res.status(400).json({
        success: false,
        message: 'City parameter is required (e.g. ?city=bengaluru or ?city=indore).',
      });
    }

    let results = [];

    if (isDbConnected()) {
      const query = {
        citySlug: targetCitySlug,
        isActive: true,
        isAvailable: true,
      };

      if (isPureVeg === 'true') {
        query.isPureVeg = true;
      }

      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        query.$or = [
          { name: regex },
          { cuisine: regex },
          { location: regex },
          { 'menu.name': regex },
          { 'menu.category': regex },
        ];
      }

      let mongoQuery = Restaurant.find(query);

      if (sortBy === 'rating') {
        mongoQuery = mongoQuery.sort({ rating: -1 });
      } else if (sortBy === 'delivery') {
        mongoQuery = mongoQuery.sort({ deliveryMinutes: 1 });
      } else if (sortBy === 'cost_asc') {
        mongoQuery = mongoQuery.sort({ startingPrice: 1 });
      } else if (sortBy === 'cost_desc') {
        mongoQuery = mongoQuery.sort({ startingPrice: -1 });
      }

      results = await mongoQuery.lean();

      // If database has not been seeded yet, fall back to in-memory dataset
      if (!results.length) {
        results = searchRestaurantsInCity(search, targetCitySlug);
      }
    } else {
      results = searchRestaurantsInCity(search, targetCitySlug);
    }

    // Secondary client-compatible category filtering
    if (category && category !== 'all') {
      results = results.filter((r) => {
        const cLower = category.toLowerCase();
        const cuisine = (r.cuisine || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        const hasMenuMatch = r.menu?.some((m) => (m.category || '').toLowerCase() === cLower);
        return cuisine.includes(cLower) || desc.includes(cLower) || hasMenuMatch;
      });
    }

    if (isPureVeg === 'true') {
      results = results.filter((r) => r.isPureVeg);
    }

    // Sort in-memory if needed
    if (sortBy === 'rating') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'delivery') {
      results.sort((a, b) => (a.deliveryMinutes || 30) - (b.deliveryMinutes || 30));
    } else if (sortBy === 'cost_asc') {
      results.sort((a, b) => (a.startingPrice || 0) - (b.startingPrice || 0));
    } else if (sortBy === 'cost_desc') {
      results.sort((a, b) => (b.startingPrice || 0) - (a.startingPrice || 0));
    }

    const cityMeta = SUPPORTED_CITIES.find(
      (c) => c.slug === targetCitySlug || c.name.toLowerCase() === targetCitySlug
    ) || { name: targetCitySlug, slug: targetCitySlug };

    return res.status(200).json({
      success: true,
      city: cityMeta,
      citySlug: targetCitySlug,
      count: results.length,
      restaurants: results,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve city restaurants.',
      error: err.message,
    });
  }
};

/**
 * @desc    Get restaurant details by ID with city validation
 * @route   GET /api/v1/restaurants/:id
 * @access  Public
 */
export const getRestaurantDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { city, citySlug } = req.query;
    const activeCitySlug = (citySlug || city || '').toLowerCase().trim();

    let restaurant = null;

    if (isDbConnected()) {
      restaurant = await Restaurant.findOne({
        $or: [{ restaurantId: id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      }).lean();
    }

    if (!restaurant) {
      restaurant = findRestaurantById(id);
    }

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: `Restaurant with ID '${id}' was not found.`,
      });
    }

    // If client provided a city, verify that the restaurant belongs to that city
    if (activeCitySlug && restaurant.citySlug !== activeCitySlug) {
      return res.status(400).json({
        success: false,
        isCityMismatch: true,
        restaurantCity: restaurant.city,
        restaurantCitySlug: restaurant.citySlug,
        requestedCity: activeCitySlug,
        message: `This restaurant is located in ${restaurant.city}, but you are currently browsing in ${activeCitySlug.toUpperCase()}.`,
      });
    }

    return res.status(200).json({
      success: true,
      restaurant,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch restaurant details.',
      error: err.message,
    });
  }
};

/**
 * @desc    Seed multi-city restaurants into database
 * @route   POST /api/v1/restaurants/seed
 * @access  Public (Demo / Setup)
 */
export const seedRestaurants = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(200).json({
        success: true,
        message: 'MongoDB is offline. Multi-city dataset is active via resilient in-memory store.',
        totalRestaurants: ALL_CITIES_RESTAURANTS.length,
      });
    }

    await Restaurant.deleteMany({});
    const docs = await Restaurant.insertMany(ALL_CITIES_RESTAURANTS);

    return res.status(201).json({
      success: true,
      message: `Successfully seeded ${docs.length} restaurants across 11 Indian cities into MongoDB.`,
      count: docs.length,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to seed restaurants.',
      error: err.message,
    });
  }
};
