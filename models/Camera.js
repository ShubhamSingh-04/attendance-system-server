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
    // Add a reference to the Location collection
    room: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true, // A camera must be in a location
    },
    cameraAccessLink: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

// cameraSchema.index({ cameraId: 1 });
cameraSchema.index({ room: 1 });
export const Camera = model('Camera', cameraSchema);
