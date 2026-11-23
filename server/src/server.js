import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/database.js';
import { seedInitialCoupons } from './controllers/couponController.js';

dotenv.config();

const PORT = Number(process.env.PORT) || 5001;

// Connect to Database and seed initial coupons
connectDB().then(() => {
  seedInitialCoupons();
});

// Start HTTP Server
const server = app.listen(PORT, () => {
  console.log(`🚀 BiteBox Backend Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`🔗 API endpoint: http://localhost:${PORT}/api/auth`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️ Port ${PORT} is already in use (e.g. by AirPlay Receiver on macOS or another process).`);
    console.error(`👉 Set PORT in server/.env to another port like 5002 or disable AirPlay Receiver in macOS System Settings > General > AirDrop & AirPlay.`);
  } else {
    console.error(`Server error: ${err.message}`);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
});
