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
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

roomSchema.virtual('cameras', {
  ref: 'Camera', // The model to populate from
  localField: '_id', // Find in Camera where...
  foreignField: 'room', // ...'room' field matches this model's '_id'
  justOne: false, // We expect an array, not a single document
});

export const Room = model('Room', roomSchema);
