import { adminService } from '../services/adminService.js';
import mongoose from 'mongoose';

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

export const adminController = {
  getAllTeachers,
  addTeacher,
  editTeacher,
  deleteTeacher,
};
