import { Camera } from '../models/Camera.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Helper for getting file paths ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This is the directory to save class photos
const CLASS_PICS_DIR = path.join(__dirname, '..', 'uploads', 'class_pics');

export async function getCameraForRoom(roomId) {
  const camera = await Camera.findOne({ room: roomId }).lean();
  // console.log(camera);

  if (!camera) {
    const err = new Error('No camera found for this room');
    console.log('No Camera Found for ', roomId);
    err.statusCode = 404;
    throw err;
  }

  if (!camera.cameraAccessLink) {
    const err = new Error('Camera access link is not configured');
    err.statusCode = 404;
    throw err;
  }

  return camera;
}

/**
 * Fetches a single snapshot from a camera and saves it to the filesystem.
 * @param {string} roomId - The ID of the room to get the camera from.
 * @param {string} classId - Used for naming the file.
 * @param {string} subjectId - Used for naming the file.
 * @returns {Promise<string>} The filename of the saved image.
 */
export async function getSnapshotFromCamera(roomId, classId, subjectId) {
  // 1. Get camera config
  const camera = await getCameraForRoom(roomId);
  const streamUrl = camera.cameraAccessLink; // e.g., http://.../video

  // *** CRITICAL ASSUMPTION ***
  // We assume the snapshot URL is /shot.jpg based on the stream URL.
  // This is standard for the "IP Webcam" app.
  if (!streamUrl.includes('/video')) {
    throw new Error(
      'Camera access link is not a /video stream. Cannot find snapshot URL.'
    );
  }
  const snapshotUrl = streamUrl.replace('/video', '/shot.jpg');
  console.log(`[Camera Service] Fetching snapshot from: ${snapshotUrl}`);

  // 3. Fetch the image as a stream
  let response;
  try {
    response = await axios.get(snapshotUrl, {
      responseType: 'stream',
    });
  } catch (err) {
    console.error(
      `Failed to connect to snapshot URL ${snapshotUrl}: ${err.message}`
    );
    throw new Error('Camera snapshot URL is unreachable.');
  }

  // 4. Create a unique filename and save path
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const imageName = `${classId}-${subjectId}-${timestamp}.jpg`;
  const savePath = path.join(CLASS_PICS_DIR, imageName);

  // 5. Save the image to disk by piping the stream
  // We wrap this in a Promise to await its completion
  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(savePath);
    response.data.pipe(writer);
    let error = null;
    writer.on('error', (err) => {
      error = err;
      writer.close();
      reject(err);
    });
    writer.on('close', () => {
      if (!error) {
        console.log(`[Camera Service] Snapshot saved: ${imageName}`);
        resolve(imageName);
      }
    });
  });

  // 6. Return the filename
  return imageName;
}
export default {
  // fetchCameraImage,
  getCameraForRoom,
  getSnapshotFromCamera,
};
