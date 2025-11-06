// server.js
import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import connectDB from './config/db.js';

// routes
import teacherRoutes from './routes/teacherRoute.js';
import authRoutes from './routes/authRoute.js';
import adminRoutes from './routes/adminRoute.js';

// Initialize Express app
const app = express();

// Load environment variables
await dotenv.config();

// Middleware: parse JSON requests
app.use(express.json());
app.use(cors());

// Setup logging
// Ensure logs folder exists
const logDir = path.join('./logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

// Create write stream for logging
const accessLogStream = fs.createWriteStream(
  path.join(logDir, 'access.log'),
  { flags: 'a' } // append mode
);

// Morgan: log requests to file
app.use(
  morgan(':method :url :status :response-time ms - :res[content-length]', {
    stream: accessLogStream,
  })
);

// Optional: log to console in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Sample route
app.get('/test', (req, res) => {
  res.status(200).json({ message: 'Server is running!' });
});

// routes
app.use('/api/teacher', teacherRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// 404 Not Found Handler
// This catches any request that doesn't match a route
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error); // Pass the error to the next handler
});

// General Error Handler
// This is where your 'throw new Error()' will end up!
app.use((err, req, res, next) => {
  // Check for Mongoose bad ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ message: 'Resource not found. Invalid ID.' });
  }

  // Determine the status code
  // If the error has a res.statusCode (like from res.status(403)), use it
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode);
  res.json({
    message: err.message,
    // Only include the stack trace in development mode
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  // Connect to MongoDB
  await connectDB();

  console.log(`Server running on port ${PORT}`);
});
