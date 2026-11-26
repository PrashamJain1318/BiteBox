import express from 'express';
import {
  getRestaurants,
  getRestaurantDetails,
  seedRestaurants,
} from '../controllers/restaurantController.js';

const router = express.Router();

router.get('/', getRestaurants);
router.get('/:id', getRestaurantDetails);
router.post('/seed', seedRestaurants);

export default router;
