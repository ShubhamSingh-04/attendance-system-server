// server.js
import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import connectDB from './config/db.js';

// routes
import teacherRoutes from './routes/teacher.route.js';
import authRoutes from './routes/auth.route.js';

// Initialize Express app
const app = express();

// Load environment variables
await dotenv.config();

// Middleware: parse JSON requests
app.use(express.json());
app.use(cors());

// --------------------------
// Setup logging
// --------------------------

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

// routes
app.use('/api/teacher', teacherRoutes);
app.use('/api/auth', authRoutes);

// --------------------------
// Sample route
// --------------------------
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Server is running!' });
});

// Example API route
app.post('/api/test', (req, res) => {
  const { name, usn } = req.body;
  res.status(200).json({ message: `Received data for ${name} (${usn})` });
});

// --------------------------
// Start server
// --------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  // Connect to MongoDB
  await connectDB();

  console.log(`🚀 Server running on port ${PORT}`);
});
