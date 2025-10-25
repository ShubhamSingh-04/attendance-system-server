// config/db.js
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Connect to MongoDB using URI from .env
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1); // Stop server if DB fails to connect
  }
};

// Handle process termination gracefully
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected!');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('💀 MongoDB connection closed due to app termination');
  process.exit(0);
});

export default connectDB;
