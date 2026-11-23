import app from '../server/src/app.js';
import { connectDB } from '../server/src/config/database.js';

// Connect to MongoDB in serverless execution if URI is present
if (process.env.MONGODB_URI) {
  connectDB().catch((err) => console.warn('Serverless MongoDB connect error:', err.message));
}

export default app;
