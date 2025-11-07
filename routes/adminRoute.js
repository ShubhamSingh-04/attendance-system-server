import express from 'express';
const router = express.Router();
import protectMiddleware from '../middlewares/protectMiddleware.js';
import roleMiddleware from '../middlewares/roleMiddleware.js';
import userController from '../controllers/userController.js';
import { adminController } from '../controllers/adminController.js';

router.use(protectMiddleware.protect);
router.use(roleMiddleware.isAdmin);

router.get('/me', userController.getSelfProfile);

// --------------- TEACHER ---------------------------
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

router.delete('/teachers/:id', adminController.deleteTeacher);
/**
 * @desc    Get all rooms (and their cameras)
 * @route   GET /api/admin/rooms
 * @access  Private/Admin
 */
// ---------------------------------

// -------------- ROOMS -----------------------
router.get('/rooms', adminController.getAllRooms);

/**
 * @desc    Add a new room
 * @route   POST /api/admin/rooms
 * @access  Private/Admin
 */
router.post('/rooms', adminController.addRoom);

/**
 * @desc    Edit room details
 * @route   PUT /api/admin/rooms/:id
 * @access  Private/Admin
 */
router.put('/rooms/:id', adminController.editRoom);

/**
 * @desc    Delete a room
 * @route   DELETE /api/admin/rooms/:id
 * @access  Private/Admin
 */
router.delete('/rooms/:id', adminController.deleteRoom);

// --------------------------------------

// ------------- SUBJECTS -------------------
/*
 * @desc    Get all subjects (populated with class info)
 * @route   GET /api/admin/subjects
 * @access  Private/Admin
 */
router.get('/subjects', adminController.getAllSubjects);

/*
 * @desc    Add a new subject
 * @route   POST /api/admin/subjects
 * @access  Private/Admin
 */
router.post('/subjects', adminController.addSubject);

/*
 * @desc    Delete a subject by ID
 * @route   DELETE /api/admin/subjects/:id
 * @access  Private/Admin
 */
router.delete('/subjects/:id', adminController.deleteSubject);

/*
 * @desc    Get all classes
 * @route   GET /api/admin/classes
 * @access  Private/Admin
 */

// -----------------------------------------

// ------------- CLASSES -------------------
router.get('/class', adminController.getAllClasses);

/*
 * @desc    Add a new class
 * @route   POST /api/admin/classes
 * @access  Private/Admin
 */
router.post('/class', adminController.addClass);

/*
 * @desc    Delete a class by ID
 * @route   DELETE /api/admin/classes/:id
 * @access  Private/Admin
 */
router.delete('/class/:id', adminController.deleteClass);

export default router;
