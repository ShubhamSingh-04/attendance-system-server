import express from 'express';
import { studentController } from '../controllers/studentController.js';
import protectMiddleware from '../middlewares/protectMiddleware.js';
import roleMiddleware from '../middlewares/roleMiddleware.js';
import userController from '../controllers/userController.js';

const router = express.Router();

// Apply auth middleware to all routes in this file
router.use(protectMiddleware.protect);
router.use(roleMiddleware.isStudent);

// --- Profile Route ---
router.route('/me').get(userController.getSelfProfile);

// --- Class & Subject Details ---
router.route('/my-class').get(studentController.getMyClass);
router.route('/my-subjects').get(studentController.getMySubjects);

// --- Attendance Data ---
router
  .route('/my-attendance-records')
  .get(studentController.getMyAttendanceRecords);
router.route('/my-summary').get(studentController.getMyAttendanceSummary);

export default router;
