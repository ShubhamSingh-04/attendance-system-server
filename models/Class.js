import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// Represents a department or class (e.g., "Computer Science")
const classSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    classCode: {
      type: String,
      required: true,
      unique: true,
    },
    semester: {
      type: Number,
      min: 1,
      max: 8,
    },
  },
  { timestamps: true }
);

export const Class = model('Class', classSchema);
