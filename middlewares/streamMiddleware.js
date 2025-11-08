import asyncHandler from 'express-async-handler';
import { Camera } from '../models/cameraModel.js';
import createStreamProxy from '../utils/createStreamProxy.js';

// @desc    Stream video from a camera associated with a room
// @route   GET /api/stream/room/:roomId
// @access  Private/Admin (via protectStream and isAdmin)
const streamByRoom = asyncHandler(async (req, res, next) => {
  const { roomId } = req.params;

  // Find *a* camera associated with this room.
  // If a room can have multiple cameras, you might need to find a specific one.
  // For this, we'll just find the first one.
  const camera = await Camera.findOne({ room: roomId }).lean();

  if (!camera) {
    res.status(404);
    throw new Error('No camera found for this room');
  }

  if (!camera.cameraAccessLink) {
    res.status(404);
    throw new Error('Camera access link is not configured');
  }

  // The full API path that the user requested
  // e.g., /api/stream/room/605c72ef1a3bb127c4d5e8f1
  const apiPath = req.originalUrl.split('?')[0]; // Get path without query string

  // Dynamically create the proxy for this specific request
  const proxy = createStreamProxy(camera.cameraAccessLink, apiPath);

  // Run the proxy middleware
  proxy(req, res, next);
});

export const streamController = {
  streamByRoom,
};
