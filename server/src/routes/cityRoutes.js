import express from 'express';
import { getCities, detectCity } from '../controllers/cityController.js';

const router = express.Router();

router.get('/', getCities);
router.post('/detect', detectCity);

export default router;
