import express from 'express';
import teacherController from '../controllers/teacherController.js';
import protectMiddleware from '../middlewares/protectMiddleware.js';

const router = express.Router();
router.use(protectMiddleware.protect);

/**
 * @route   GET /get-camera-pic
 * @desc    Fetches a single snapshot from the IP camera
 */
router.get(
  '/mark-attendance/:classCode/:subjectCode', // with query ?semester=1,2,3, etc (optional)
  teacherController.markAttendance
);

export default router;
