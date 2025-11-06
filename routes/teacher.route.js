import express from 'express';
import teacherController from '../controllers/teacher.controller.js';
import protectMiddleware from '../middlewares/protect.middleware.js';

const router = express.Router();
router.use(protectMiddleware.protect);

/**
 * @route   GET /get-camera-pic
 * @desc    Fetches a single snapshot from the IP camera
 */
router.get(
  '/mark-attendance/:classCode/:subjectCode',
  teacherController.markAttendance
);

export default router;
