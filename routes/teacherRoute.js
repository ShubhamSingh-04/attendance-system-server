import express from 'express';
import teacherController from '../controllers/teacherController.js';
import protectMiddleware from '../middlewares/protectMiddleware.js';
import roleMiddleware from '../middlewares/roleMiddleware.js';
import userController from '../controllers/userController.js';

const router = express.Router();
router.use(protectMiddleware.protect);
router.use(roleMiddleware.isTeacher);

router.route('/me').get(userController.getSelfProfile);

/**
 * @route   GET /api/teacher/my-classes
 * @desc    Get all classes assigned to the logged-in teacher
 * @access  Private (Teacher)
 */
router.route('/my-classes').get(teacherController.getMyClasses);

/**
 * @route   GET /api/teacher/my-subjects
 * @desc    Get all subjects (with class details) assigned to the logged-in teacher
 * @access  Private (Teacher)
 */
router.route('/my-subjects').get(teacherController.getMySubjects);

// /**
//  * @route   GET /get-camera-pic
//  * @desc    Fetches a single snapshot from the IP camera
//  */
// router.get(
//   '/mark-attendance/:classCode/:subjectCode/:roomName'
//   teacherController.markAttendance
// );

export default router;
