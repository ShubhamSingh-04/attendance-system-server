import express from 'express';
import { teacherController } from '../controllers/teacherController.js';
import protectMiddleware from '../middlewares/protectMiddleware.js';
import roleMiddleware from '../middlewares/roleMiddleware.js';
import userController from '../controllers/userController.js';

const router = express.Router();

router.use(protectMiddleware.protect);
router.use(roleMiddleware.isTeacher);

/**
 * @route   GET /api/teacher/me
 * @desc    Get self profile of logged-in teacher
 * @access  Private (Teacher)
 */
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

/**
 * @route   GET /api/teacher/check-attendance/:classId/:subjectId/:roomId
 * @desc    Takes a snapshot, runs ML, and returns a preview for teacher review
 * @access  Private (Teacher)
 */
router
  .route('/check-attendance/:classId/:subjectId/:roomId')
  .get(teacherController.checkAttendance);

/**
 * @route   POST /api/teacher/mark-attendance/:classId/:subjectId/:roomId
 * @desc    Saves final attendance to DB
 * @access  Private (Teacher)
 */
router
  .route('/mark-attendance/:classId/:subjectId/:roomId')
  .post(teacherController.markAttendance);

/**
 * @route   GET /api/teacher/records
 * @desc    Fetches saved attendance records
 * @access  Private (Teacher)
 */
router.route('/records').get(teacherController.getAttendanceRecords);

/**
 * @route   GET /api/teacher/summary
 * @desc    Fetches attendance summary for class and subject
 * @access  Private (Teacher)
 */
router.route('/summary').get(teacherController.getAttendanceSummary);

/**
 * @route   PUT /api/teacher/record/:id
 * @desc    Updates a single attendance record
 * @access  Private (Teacher)
 */
router.route('/record/:id').put(teacherController.updateAttendanceRecord);

export default router;
