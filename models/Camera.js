import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// Camera configuration
const cameraSchema = new Schema(
  {
    cameraId: {
      type: String,
      required: true,
      unique: true,
    },
    // Location or name (e.g., "Room 501", "CS Lab")
    location: {
      type: String,
    },
    // The class that this camera is assigned to
    assignedClass: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
    },
    cameraAccessLink: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

export const Camera = model('Camera', cameraSchema);
