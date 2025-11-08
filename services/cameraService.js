import { Camera } from '../models/Camera.js';

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

// const fetchCameraImage = async (cameraUrl) => {
//   // Make a GET request to the camera's snapshot URL
//   // We set responseType to 'stream' so axios gives us the data as it comes in
//   const response = await axios.get(cameraUrl, {
//     responseType: 'stream',
//   });

//   // Return the stream data
//   return response.data;
// };

export default {
  // fetchCameraImage,
  getCameraForRoom,
};
