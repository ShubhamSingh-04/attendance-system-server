import cameraService from '../services/camera.service.js';

import asyncHandler from 'express-async-handler';
import teacherService from '../services/teacherService.js';

/**
 * @desc    Get all classes assigned to the logged-in teacher
 * @route   GET /api/teacher/my-classes
 * @access  Private (Teacher)
 */
const getMyClasses = asyncHandler(async (req, res) => {
  // The user's profileId (which is the Teacher _id) is attached by protectMiddleware
  const teacherProfileId = req.user.profileId;

  const classes = await teacherService.fetchMyClasses(teacherProfileId);

  res.status(200).json({
    count: classes.length,
    classes,
  });
});

/**
 * @desc    Get all subjects assigned to the logged-in teacher (with details)
 * @route   GET /api/teacher/my-subjects
 * @access  Private (Teacher)
 */
const getMySubjects = asyncHandler(async (req, res) => {
  // Get the Teacher _id from the authenticated user
  const teacherProfileId = req.user.profileId;

  const subjects = await teacherService.fetchMySubjects(teacherProfileId);

  res.status(200).json({
    count: subjects.length,
    subjects,
  });
});

/**
 * @desc    Mark attendance (placeholder)
 * @route   GET /api/teacher/mark-attendance/...
 * @access  Private (Teacher)
 */
const markAttendance = asyncHandler(async (req, res) => {
  // Your logic for markAttendance would go here
  res.status(200).json({ message: 'Attendance marking logic not implemented' });
});

// /**
//  * Controller to handle fetching the camera picture.
//  * It calls the service to get the image stream and
//  * pipes it to the response. It also handles error formatting.
//  */
// const markAttendance = async (req, res) => {
//   try {
//     const CAMERA_URL = 'http://192.168.1.3:8080/shot.jpg';
//     const imageStream = await cameraService.fetchCameraImage(CAMERA_URL);

//     // --- Success ---
//     // Set the content-type header
//     res.setHeader('Content-Type', 'image/jpeg');

//     // Pipe the image data from the service straight to the client's response
//     imageStream.pipe(res);
//   } catch (error) {
//     // --- Error Handling ---
//     let errorMessage = 'Error fetching image from camera.';

//     if (error.response) {
//       // The request was made and the server responded with a non-2xx status
//       console.error(
//         'Camera server responded with error:',
//         error.response.status
//       );
//       errorMessage = `Camera server error: ${error.response.status}`;
//     } else if (error.request) {
//       // The request was made but no response was received
//       console.error('No response from camera server. Is it on?');
//       errorMessage =
//         'Could not connect to camera. Check IP and if server is running.';
//     } else {
//       // Something else happened in setting up the request
//       console.error('Axios error:', error.message);
//       errorMessage = error.message;
//     }

//     res.status(500).send({ error: errorMessage });
//   }
// };

export default {
  getMyClasses,
  getMySubjects,
  markAttendance,
};
