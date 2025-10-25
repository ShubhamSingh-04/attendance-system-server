import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// Represents a department or class (e.g., "Computer Science", "Electronics")
const classSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    // e.g., "CS", "EC"
    shortCode: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

export const Class = model('Class', classSchema);
