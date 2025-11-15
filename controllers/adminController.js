import { adminService } from '../services/adminService.js';
import { roomService } from '../services/roomService.js';
import { subjectService } from '../services/subjectService.js';
import { classService } from '../services/classService.js';
import { studentService } from '../services/studentService.js';
import teacherService from '../services/teacherService.js';
import createStreamProxy from '../utils/createStreamProxy.js';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
import cameraService from '../services/cameraService.js';

dotenv.config();

/**
 * @desc    Get dashboard stats (counts of students, teachers, rooms)
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  try {
    // Run all count queries in parallel for maximum efficiency
    const [studentCount, teacherCount, roomCount] = await Promise.all([
      studentService.countStudents(),
      teacherService.countTeachers(),
      roomService.countRooms(),
    ]);

    res.status(200).json({
      students: studentCount,
      teachers: teacherCount,
      rooms: roomCount,
    });
  } catch (error) {
    res.status(500);
    throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
  }
});

// =================================================================
// --- TEACHER CONTROLLERS ---
// =================================================================
/**
 * @desc    Get all teachers
 * @route   GET /api/admin/teachers
 * @access  Private/Admin
 */
const getAllTeachers = async (req, res) => {
  try {
    const teachers = await adminService.getAllTeachers();
    res.status(200).json({
      count: teachers.length,
      teachers,
    });
  } catch (error) {
    // General server error
    console.error('getAllTeachers controller error:', error);
    res.status(500).json({ message: 'Server error while fetching teachers.' });
  }
};

/**
 * @desc    Add a new teacher
 * @route   POST /api/admin/teachers
 * @access  Private/Admin
 */
const addTeacher = async (req, res) => {
  const {
    username,
    email,
    password,
    teacherID,
    name,
    subjects,
    assignedClasses,
  } = req.body;

  // Basic validation
  if (!username || !email || !password || !teacherID || !name) {
    return res
      .status(400)
      .json({ message: 'Missing required fields for teacher creation.' });
  }

  try {
    const teacherData = {
      username,
      email,
      password,
      teacherID,
      name,
      subjects,
      assignedClasses,
    };

    const newTeacher = await adminService.addTeacher(teacherData);

    res.status(201).json(newTeacher); // 201 Created
  } catch (error) {
    // Check for duplicate key errors (e.g., username, email) from User model
    if (error.code === 11000) {
      const duplicateKey = Object.keys(error.keyValue)[0];
      return res.status(409).json({
        message: `A user with this ${duplicateKey} already exists.`,
        field: duplicateKey,
      });
    }

    // Check for our custom validation errors from the service
    if (
      error.message.startsWith('Invalid subject codes') ||
      error.message.startsWith('Invalid class codes')
    ) {
      return res.status(400).json({ message: error.message }); // 400 Bad Request
    }

    // Check for duplicate teacherID error from the service's catch block
    if (error.message.startsWith('A teacher with this')) {
      return res.status(409).json({ message: error.message });
    }

    // General server error
    console.error('addTeacher controller error:', error);
    res.status(500).json({ message: 'Server error while adding teacher.' });
  }
};

/**
 * @desc    Edit teacher details
 * @route   PUT /api/admin/teachers/:id
 * @access  Private/Admin
 */
const editTeacher = async (req, res) => {
  const { id } = req.params; // This is the Teacher's _id
  const updateData = req.body; // Validate MongoDB ID format

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid teacher ID format.' });
  }

  try {
    const updatedTeacher = await adminService.editTeacher(id, updateData);
    res.status(200).json(updatedTeacher); // 200 OK
  } catch (error) {
    // Check for not found error from service
    if (
      error.message.startsWith('Teacher not found') ||
      error.message.startsWith('Associated user account not found')
    ) {
      return res.status(404).json({ message: error.message });
    } // Check for duplicate key errors (e.g., username, email, teacherID)

    if (error.code === 11000 || error.message.includes('already exists')) {
      const duplicateKey = error.keyValue
        ? Object.keys(error.keyValue)[0]
        : error.message.split('this ')[1]?.split(' ')[0] || 'field';
      return res.status(409).json({
        message: `A user or teacher with this ${duplicateKey} already exists.`,
        field: duplicateKey,
      });
    } // Check for our custom validation errors from the service

    if (
      error.message.startsWith('Invalid subject codes') ||
      error.message.startsWith('Invalid class codes')
    ) {
      return res.status(400).json({ message: error.message }); // 400 Bad Request
    } // General server error

    console.error('editTeacher controller error:', error);
    res.status(500).json({ message: 'Server error while updating teacher.' });
  }
};

/**
 * @desc    Delete a teacher
 * @route   DELETE /api/admin/teachers/:id
 * @access  Private/Admin
 */
const deleteTeacher = async (req, res) => {
  const { id } = req.params; // This is the Teacher's _id // Validate MongoDB ID format

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid teacher ID format.' });
  }

  try {
    await adminService.deleteTeacher(id);
    res
      .status(200)
      .json({ message: 'Teacher and associated user deleted successfully.' });
  } catch (error) {
    // Check for not found error from service
    if (error.message.startsWith('Teacher not found')) {
      return res.status(404).json({ message: error.message });
    } // General server error

    console.error('deleteTeacher controller error:', error);
    res.status(500).json({ message: 'Server error while deleting teacher.' });
  }
};
// ---------------------------------

// =================================================================
// --- ROOM CONTROLLERS ---
// =================================================================

/**
 * @desc    Add a new room (and optionally cameras)
 * @route   POST /api/admin/rooms
 * @access  Private/Admin
 */
const addRoom = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Missing required field: name.' });
  }

  try {
    const newRoom = await roomService.addRoom(req.body);
    res.status(201).json({
      message: 'Room added successfully',
      newRoom,
    });
  } catch (error) {
    // Check for duplicate or validation errors from the service
    if (
      error.message.includes('already exists') ||
      error.code === 11000 // Just in case
    ) {
      return res.status(409).json({ message: error.message });
    }
    if (error.message.includes('Invalid camera data')) {
      return res.status(400).json({ message: error.message });
    }
    console.error('addRoom controller error:', error);
    res.status(500).json({ message: 'Server error while adding room.' });
  }
};

/**
 * @desc    Get all rooms (with cameras)
 * @route   GET /api/admin/rooms
 * @access  Private/Admin
 */
const getAllRooms = async (req, res) => {
  // (No changes here)
  try {
    const rooms = await roomService.getAllRooms();
    res.status(200).json({
      count: rooms.length,
      rooms,
    });
  } catch (error) {
    console.error('getAllRooms controller error:', error);
    res.status(500).json({ message: 'Server error while fetching rooms.' });
  }
};

/**
 * @desc    Edit room details (and Add/Update cameras)
 * @route   PUT /api/admin/rooms/:id
 * @access  Private/Admin
 */
// This is your updated controller function
const editRoom = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid room ID format.' });
  }

  try {
    const updatedRoom = await roomService.editRoom(id, req.body);
    res.status(200).json(updatedRoom);
  } catch (error) {
    if (
      error.message.startsWith('Room not found') ||
      error.message.startsWith('No existing camera found') // <-- ADDED THIS
    ) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('already exists')) {
      return res.status(409).json({ message: error.message });
    }
    // This catches the 'array not supported' error
    if (error.message.includes('not supported')) {
      return res.status(400).json({ message: error.message });
    }

    // General server error
    console.error('editRoom controller error:', error);
    res.status(500).json({ message: 'Server error while updating room.' });
  }
};
const deleteRoom = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid room ID format.' });
  }

  try {
    // The service now returns a success message
    const result = await roomService.deleteRoom(id);
    res.status(200).json(result); // e.g., { message: 'Room and all associated cameras deleted successfully.' }
  } catch (error) {
    // Check for not found error from service
    if (error.message.startsWith('Room not found')) {
      return res.status(404).json({ message: error.message });
    }

    // General server error
    console.error('deleteRoom controller error:', error);
    res.status(500).json({ message: 'Server error while deleting room.' });
  }
};

// =================================================================
// --- SUBJECT CONTROLLERS ---
// =================================================================

/**
 * @desc    Get all subjects
 * @route   GET /api/admin/subjects
 * @access  Private/Admin
 */
const getAllSubjects = async (req, res) => {
  try {
    const subjects = await subjectService.getAllSubjects();
    res.status(200).json({
      count: subjects.length,
      subjects,
    });
  } catch (error) {
    console.error('getAllSubjects controller error:', error);
    res.status(500).json({ message: 'Server error while fetching subjects.' });
  }
};

/**
 * @desc    Add a new subject
 * @route   POST /api/admin/subjects
 * @access  Private/Admin
 */
const addSubject = async (req, res) => {
  try {
    const newSubject = await subjectService.addSubject(req.body);
    res.status(201).json(newSubject);
  } catch (error) {
    // Handle specific errors from the service
    if (error.message.includes('already exists')) {
      return res.status(409).json({ message: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    console.error('addSubject controller error:', error);
    res.status(500).json({ message: 'Server error while adding subject.' });
  }
};

/**
 * @desc    Delete a subject
 * @route   DELETE /api/admin/subjects/:id
 * @access  Private/Admin
 */
const deleteSubject = async (req, res) => {
  const { id } = req.params;

  // Check for valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid subject ID format.' });
  }

  try {
    const result = await subjectService.deleteSubject(id);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.startsWith('Subject not found')) {
      return res.status(404).json({ message: error.message });
    }

    console.error('deleteSubject controller error:', error);
    res.status(500).json({ message: 'Server error while deleting subject.' });
  }
};

// =================================================================
// --- CLASS CONTROLLERS ---
// =================================================================

/**
 * @desc    Get all classes
 * @route   GET /api/admin/classes
 * @access  Private/Admin
 */
export const getAllClasses = async (req, res) => {
  try {
    const classes = await classService.getAllClasses();
    res.status(200).json({
      count: classes.length,
      classes,
    });
  } catch (error) {
    console.error('getAllClasses controller error:', error);
    res.status(500).json({ message: 'Server error while fetching classes.' });
  }
};

/**
 * @desc    Add a new class
 * @route   POST /api/admin/classes
 * @access  Private/Admin
 */
export const addClass = async (req, res) => {
  try {
    const newClass = await classService.addClass(req.body);
    res.status(201).json(newClass);
  } catch (error) {
    // Handle specific errors from the service
    if (error.message.includes('already exists')) {
      return res.status(409).json({ message: error.message });
    }
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    console.error('addClass controller error:', error);
    res.status(500).json({ message: 'Server error while adding class.' });
  }
};

/**
 * @desc    Delete a class
 * @route   DELETE /api/admin/classes/:id
 * @access  Private/Admin
 */
export const deleteClass = async (req, res) => {
  const { id } = req.params;

  // Check for valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid class ID format.' });
  }

  try {
    const result = await classService.deleteClass(id);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.startsWith('Class not found')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.startsWith('Cannot delete class')) {
      // This is the custom error from our service
      return res.status(400).json({ message: error.message });
    }

    console.error('deleteClass controller error:', error);
    res.status(500).json({ message: 'Server error while deleting class.' });
  }
};

// =================================================================
// --- STUDENT CONTROLLERS ---
// =================================================================

/**
 * @desc    Create a new student
 * @route    POST /api/admin/create-student
 * @access   Private/Admin
 */
export const createStudent = asyncHandler(async (req, res) => {
  const {
    name,
    classCode,
    rollNo,
    semester,
    username,
    email,
    password,
    phoneNumber,
  } = req.body;

  // 1. Validate file upload
  if (!req.file) {
    res.status(400);
    throw new Error('Student image is required.');
  }

  const imagePath = req.file.path;
  const imageFilename = req.file.filename;

  try {
    // 2. Call the service layer with all the data
    const { user, student } = await studentService.createNewStudent({
      name,
      classCode,
      rollNo,
      semester,
      username,
      email,
      password,
      phoneNumber,
      imageFilename, // Pass the filename to the service
    });

    // 3. Service succeeded: Send response
    res.status(201).json({
      message: 'Student created successfully.',
      user,
      student,
    });
  } catch (error) {
    // 4. --- CONTROLLER-LEVEL CLEANUP ---
    // If anything in the service fails, delete the orphaned file
    fs.unlinkSync(imagePath);

    // 5. Send the error response
    // Use the status code from the service error, or default
    res.status(error.statusCode || 500);
    console.error('Create student failed:', error.message);
    throw new Error(`Upload failed ${error.message}`);
  }
});

/**
 * @desc    Delete a student
 * @route    DELETE /api/admin/student/:id
 * @access   Private/Admin
 */
export const deleteStudent = asyncHandler(async (req, res) => {
  try {
    // The ID comes from the URL parameters (e.g., /api/admin/student/12345)
    const studentId = req.params.id;

    if (!studentId) {
      res.status(400);
      throw new Error('Student ID is required.');
    }

    // Call the service to do all the work
    const { message } = await studentService.deleteStudentById(studentId);

    // Send success response
    res.status(200).json({ message });
  } catch (error) {
    // Pass the error to the Express error handler
    res.status(error.statusCode || 500);
    console.error('Delete student failed:', error.message);
    throw new Error(`Could not delete student: ${error.message}`);
  }
});

/**
 * @desc    Update a student
 * @route    PUT /api/admin/student/:id
 * @access   Private/Admin
 */
export const updateStudent = asyncHandler(async (req, res) => {
  const studentId = req.params.id;
  const {
    name,
    classCode,
    rollNo,
    semester,
    username,
    email,
    password,
    phoneNumber,
  } = req.body;

  // Check if a new file was uploaded
  const imageFilename = req.file ? req.file.filename : null;
  const imagePath = req.file ? req.file.path : null;

  try {
    const { user, student } = await studentService.updateStudentById(
      studentId,
      {
        name,
        classCode,
        rollNo,
        semester,
        username,
        email,
        password, // Pass password (can be empty/null to skip update)
        phoneNumber,
        imageFilename, // Pass the filename (or null) to the service
      }
    );

    res.status(200).json({
      message: 'Student updated successfully.',
      user,
      student,
    });
  } catch (error) {
    // If an image was uploaded but the service failed, delete the new file
    if (imagePath) {
      fs.unlinkSync(imagePath);
    }

    // Pass the error to the Express error handler
    res.status(error.statusCode || 500);
    console.error('Update student failed:', error.message);
    throw new Error(`Could not update student: ${error.message}`);
  }
});

/**
 * @desc    Get all students, or filter by class
 * @route    GET /api/admin/students
 * @route    GET /api/admin/students?classCode=...
 * @access   Private/Admin
 */
export const getStudents = asyncHandler(async (req, res) => {
  // Check for classCode in the query parameters
  const { classCode } = req.query;

  try {
    const { count, students } = await studentService.getStudents({ classCode });

    res.status(200).json({
      count,
      students,
    });
  } catch (error) {
    res.status(error.statusCode || 500);
    console.error('Get students failed:', error.message);
    throw new Error(`Could not get students: ${error.message}`);
  }
});

// @desc    Stream video from a camera associated with a room
// @route   GET /api/admin/stream/:roomId
// @access  Public (or Private if you add middleware back)
export const streamByRoom = asyncHandler(async (req, res, next) => {
  const { roomId } = req.params;

  let camera;
  try {
    // 1. Get camera data
    camera = await cameraService.getCameraForRoom(roomId);
  } catch (error) {
    res.status(error.statusCode || 500);
    console.error('Camera Not Found for the room: ', roomId);
    throw new Error(`Error fetching camera for the room: ${error.message}`);
  }

  // --- FIX: Splitting URL and simplifying proxy ---
  let targetHost;
  let targetPath;
  try {
    // 2. Split the full URL from the database
    const cameraUrl = new URL(camera.cameraAccessLink);
    targetHost = cameraUrl.origin; // e.g., "http://192.168.1.3:8080"
    targetPath = cameraUrl.pathname; // e.g., "/video"
  } catch (urlError) {
    console.error(
      'Invalid cameraAccessLink in database:',
      camera.cameraAccessLink
    );
    res.status(500);
    throw new Error('Camera configuration is invalid. URL is malformed.');
  }

  req.url = targetPath; // e.g., "/video"

  // Add logs to see what's happening
  // console.log(`[Stream Proxy] Request for: ${req.originalUrl.split('?')[0]}`);
  // console.log(`[Stream Proxy] -> Target Host: ${targetHost}`);
  // console.log(`[Stream Proxy] -> Forwarding to path: ${req.url}`);

  // 5. Dynamically create the proxy with the host and *no rewrite rules*
  const proxy = createStreamProxy(targetHost, {}); // Pass empty rules

  // 6. Run the proxy middleware
  proxy(req, res, next);
});

export const adminController = {
  getAllTeachers,
  addTeacher,
  editTeacher,
  deleteTeacher,
  addRoom,
  getAllRooms,
  editRoom,
  deleteRoom,
  deleteSubject,
  addSubject,
  getAllSubjects,
  deleteClass,
  getAllClasses,
  addClass,
  createStudent,
  deleteStudent,
  updateStudent,
  getStudents,
  streamByRoom,
  getDashboardStats,
};
