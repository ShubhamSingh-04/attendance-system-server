import express from 'express';
import protectMiddleware from '../middlewares/protectMiddleware.js';
import roleMiddleware from '../middlewares/roleMiddleware.js';
import userController from '../controllers/userController.js';
import { adminController } from '../controllers/adminController.js';

// accepts a single file with the field name 'studentImage'
import uploadStudentPic from '../middlewares/multerConfig.js';

const router = express.Router();

// Apply protection and admin-role validation to all routes in this file
router.use(protectMiddleware.protect);
router.use(roleMiddleware.isAdmin);

// Note: This route is also protected by isAdmin.
// If this should be available to non-admins, move it *before* router.use(roleMiddleware.isAdmin);
router.get('/me', userController.getSelfProfile);

// --------------- TEACHER ---------------------------
router
  .route('/teachers')
  .get(adminController.getAllTeachers)
  .post(adminController.addTeacher);

router
  .route('/teachers/:id')
  .put(adminController.editTeacher)
  .delete(adminController.deleteTeacher);

// -------------- ROOMS -----------------------
router
  .route('/rooms')
  .get(adminController.getAllRooms)
  .post(adminController.addRoom);

router
  .route('/rooms/:id')
  .put(adminController.editRoom)
  .delete(adminController.deleteRoom);

// ------------- SUBJECTS -------------------
router
  .route('/subjects')
  .get(adminController.getAllSubjects)
  .post(adminController.addSubject);

router.route('/subjects/:id').delete(adminController.deleteSubject);

// ------------- CLASSES -------------------
router
  .route('/class')
  .get(adminController.getAllClasses)
  .post(adminController.addClass);

router.route('/class/:id').delete(adminController.deleteClass);

// ------------- STUDENTS -------------------
router.route('/students').get(adminController.getStudents);

router.route('/student').post(uploadStudentPic, adminController.createStudent);

router
  .route('/student/:id')
  .put(uploadStudentPic, adminController.updateStudent)
  .delete(adminController.deleteStudent);

export default router;
