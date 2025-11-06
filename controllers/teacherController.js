import cameraService from '../services/camera.service.js';

/**
 * Controller to handle fetching the camera picture.
 * It calls the service to get the image stream and
 * pipes it to the response. It also handles error formatting.
 */
const markAttendance = async (req, res) => {
  try {
    const CAMERA_URL = 'http://192.168.1.3:8080/shot.jpg';
    const imageStream = await cameraService.fetchCameraImage(CAMERA_URL);

    // --- Success ---
    // Set the content-type header
    res.setHeader('Content-Type', 'image/jpeg');

    // Pipe the image data from the service straight to the client's response
    imageStream.pipe(res);
  } catch (error) {
    // --- Error Handling ---
    let errorMessage = 'Error fetching image from camera.';

    if (error.response) {
      // The request was made and the server responded with a non-2xx status
      console.error(
        'Camera server responded with error:',
        error.response.status
      );
      errorMessage = `Camera server error: ${error.response.status}`;
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response from camera server. Is it on?');
      errorMessage =
        'Could not connect to camera. Check IP and if server is running.';
    } else {
      // Something else happened in setting up the request
      console.error('Axios error:', error.message);
      errorMessage = error.message;
    }

    res.status(500).send({ error: errorMessage });
  }
};

export default {
  markAttendance,
};
