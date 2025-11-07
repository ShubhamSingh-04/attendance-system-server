import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// Represents a physical location (e.g., "Room 501", "CS Lab")
const roomSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // The location name *itself* should be unique
    },
    description: {
      // Optional, e.g., "3rd Floor, B-Block"
      type: String,
    },
  },
  { timestamps: true }
);

export const Room = model('Room', roomSchema);
