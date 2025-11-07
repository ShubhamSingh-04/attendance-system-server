import express from 'express';
const router = express.Router();
import protectMiddleware from '../middlewares/protectMiddleware.js';
import roleMiddleware from '../middlewares/roleMiddleware.js';
import userController from '../controllers/userController.js';
import { adminController } from '../controllers/adminController.js';

router.use(protectMiddleware.protect);
router.use(roleMiddleware.isAdmin);

router.get('/me', userController.getSelfProfile);

/**
 * @desc    Get all teachers
 * @route   GET /teachers
 * @access  Private/Admin
 */
router.get('/teachers', adminController.getAllTeachers);

/**
 * @desc    Add a new teacher
 * @route   POST /teachers
 * @access  Private/Admin
 */
router.post('/teachers', adminController.addTeacher);

/**
 * @desc    Edit teacher details
 * @route   PUT /teachers/:id
 * @access  Private/Admin
 */
router.put('/teachers/:id', adminController.editTeacher);

/**
 * @desc    Delete a teacher
 * @route   DELETE /teachers/:id
 * @access  Private/Admin
 */
// --- ADD THIS ROUTE ---
router.delete('/teachers/:id', adminController.deleteTeacher);

export default router;
