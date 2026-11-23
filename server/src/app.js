import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load server/.env first, then root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import authRoutes from './routes/authRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

dotenv.config();

const app = express();

// Allowed origins
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = [
  clientUrl,
  'https://bite-box-six-beta.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  'http://localhost:5002',
];

// CORS configuration supporting credentials and cookies
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps or curl) or vercel deployments
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev mode
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-razorpay-signature'],
  })
);

// Body and cookie parsers (retains rawBody for webhook cryptographic signature verification)
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check endpoints (GET /api/v1/health and GET /api/health)
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'BiteBox API is running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    message: 'BiteBox API is running',
    timestamp: new Date().toISOString(),
    service: 'BiteBox API Service',
  });
});

// Authentication routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/auth', authRoutes);

// Coupon Discount System routes
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/coupons', couponRoutes); // Alias for compatibility

// Order Management routes
app.use('/api/v1/orders', orderRoutes);
app.use('/api/orders', orderRoutes); // Alias for compatibility

// Razorpay Payments routes
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/payments', paymentRoutes); // Alias for compatibility

// Direct Standard Razorpay Endpoints (POST /api/create-order & POST /api/verify-payment)
import { createStandardOrder, verifyStandardPayment } from './controllers/paymentController.js';
app.post('/api/v1/create-order', createStandardOrder);
app.post('/api/create-order', createStandardOrder);
app.post('/api/v1/verify-payment', verifyStandardPayment);
app.post('/api/verify-payment', verifyStandardPayment);

// Error handlers
app.use(notFound);
app.use(errorHandler);

export default app;
