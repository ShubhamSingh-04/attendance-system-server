import { adminService } from '../services/adminService.js';
import { roomService } from '../services/roomService.js';
import subjectService from '../services/subjectService.js';
import mongoose from 'mongoose';

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
      totalTeachers: teachers.length,
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
      noOfRooms: rooms.length,
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
      noOfSubjects: subjects.length,
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
};
