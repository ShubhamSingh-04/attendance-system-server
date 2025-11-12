import mongoose from 'mongoose';
import axios from 'axios';
import { User } from '../models/User.js';
import { Student } from '../models/Student.js';
import { Class } from '../models/Class.js';
import { Subject } from '../models/Subject.js';
import path from 'path';
import fs from 'fs';

/**
 * Counts the total number of student profiles.
 * @returns {Promise<number>} The total count of students.
 */
async function countStudents() {
  try {
    const count = await Student.countDocuments({});
    return count;
  } catch (error) {
    console.error('Error counting students:', error);
    throw new Error('Could not retrieve student count.');
  }
}

/**
 * @desc Creates a new student, user, and generates embeddings.
 * @param {object} studentData - Data object from the controller.
 * @returns {object} { user, student }
 */
export const createNewStudent = async (studentData) => {
  const {
    name,
    classCode,
    rollNo,
    semester,
    username,
    email,
    password,
    phoneNumber,
    imageFilename,
  } = studentData;

  // 1. Find the Class ID
  const studentClass = await Class.findOne({ classCode, semester });
  if (!studentClass) {
    const error = new Error(
      `Class with code ${classCode} and semester ${semester} not found.`
    );
    error.statusCode = 404;
    throw error;
  }

  // 2. Check for duplicates
  const emailExists = await User.findOne({ email });
  if (emailExists) {
    const error = new Error('User with this email already exists.');
    error.statusCode = 400;
    throw error;
  }
  const usernameExists = await User.findOne({ username });
  if (usernameExists) {
    const error = new Error('Username is already taken.');
    error.statusCode = 400;
    throw error;
  }
  const rollNoExists = await Student.findOne({ rollNo });
  if (rollNoExists) {
    const error = new Error('Student with this Roll No already exists.');
    error.statusCode = 400;
    throw error;
  }

  // 3. --- Call ML Service with dedicated error handling ---
  const mlUrl = `${process.env.ML_SERVICE_BASE_URL}/generate-embedding?student_id=${rollNo}&image_name=${imageFilename}`;
  console.log(`Calling ML Service: ${mlUrl}`);

  let faceEmbeddings;

  try {
    const { data } = await axios.get(mlUrl);

    if (!data || !data.faceEmbedding) {
      // The ML service responded 200, but with invalid data
      const error = new Error('ML service returned invalid data.');
      error.statusCode = 500; // This is an internal server error for us
      throw error;
    }

    faceEmbeddings = data.faceEmbedding;
  } catch (axiosError) {
    // This block catches errors *from the ML service call*
    console.error('ML Service call failed:', axiosError.message);

    if (axiosError.response) {
      // The ML service *responded* with an error (e.g., 400, 404, 500)
      // Your FastAPI service sends errors as { "detail": "message" }
      const mlErrorMessage =
        axiosError.response.data?.detail || 'Unknown ML Error';
      const mlStatusCode = axiosError.response.status || 500;

      const error = new Error(`ML Service Error: ${mlErrorMessage}`);
      error.statusCode = mlStatusCode; // Pass the *original* error code
      throw error;
    } else if (axiosError.request) {
      // The request was made but no response was received (ML service is down)
      const error = new Error('ML service is not responding.');
      error.statusCode = 503; // Service Unavailable
      throw error;
    } else {
      // Something else went wrong
      const error = new Error(
        `Axios request setup failed: ${axiosError.message}`
      );
      error.statusCode = 500;
      throw error;
    }
  }

  // 4. --- Start Non-Atomic Database Saves ---
  // If we get here, the ML call was successful and faceEmbeddings exist.
  let createdUser = null;
  try {
    // 4a. Create the User
    createdUser = new User({
      username,
      email,
      password, // Hashing is handled by pre-save hook
      role: 'Student',
    });
    await createdUser.save();

    // 4b. Create the Student Profile
    const newStudent = new Student({
      user: createdUser._id,
      name,
      rollNo,
      class: studentClass._id,
      phoneNumber,
      faceEmbeddings: faceEmbeddings,
    });
    const createdStudent = await newStudent.save();

    // 4c. Link User's profileId back to the Student
    createdUser.profileId = createdStudent._id;
    await createdUser.save();

    // 5. All operations succeeded, return the new documents
    return { user: createdUser, student: createdStudent };
  } catch (dbError) {
    // --- MANUAL DB CLEANUP on failure ---
    // This block now *only* catches database errors
    if (createdUser && createdUser._id) {
      console.log(`Rolling back user creation: ${createdUser._id}`);
      await User.findByIdAndDelete(createdUser._id);
    }

    // Re-throw the error to be caught by the controller
    const error = new Error(`Database save failed: ${dbError.message}`);
    error.statusCode = 500;
    throw error;
  }
};

/**
 * @desc Deletes a student, their auth user, and their profile picture.
 * @param {string} studentId - The MongoDB _id of the 'Student' document.
 * @returns {object} { message }
 */
export const deleteStudentById = async (studentId) => {
  // 1. Find the Student document first
  const student = await Student.findById(studentId);
  if (!student) {
    const error = new Error('Student not found.');
    error.statusCode = 404;
    throw error;
  }

  // 2. Get the associated User ID and rollNo (for file cleanup)
  const userId = student.user;
  const rollNo = student.rollNo;

  try {
    // 3. Delete the associated documents
    // We can run these in parallel
    await Promise.all([
      User.findByIdAndDelete(userId),
      Student.findByIdAndDelete(studentId),
    ]);

    // 4. Delete the physical image file
    const uploadDir = path.join(process.cwd(), 'uploads', 'student_pics');

    // We must find the file, since we don't know its extension (e.g., .jpg, .png)
    const files = await fs.promises.readdir(uploadDir);
    const fileToDelete = files.find((file) => file.startsWith(rollNo + '.'));

    if (fileToDelete) {
      const imagePath = path.join(uploadDir, fileToDelete);
      await fs.promises.unlink(imagePath);
      console.log(`Deleted image file: ${imagePath}`);
    } else {
      console.warn(`No image file found for rollNo ${rollNo} in ${uploadDir}`);
    }

    return { message: 'Student deleted successfully.' };
  } catch (dbError) {
    // Handle any error during the deletion process
    const error = new Error(`Deletion failed: ${dbError.message}`);
    error.statusCode = 500;
    throw error;
  }
};

/**
 * @desc Updates a student's profile, user info, and optionally photo.
 * @param {string} studentId - The MongoDB _id of the 'Student' document.
 * @param {object} updateData - Data object from the controller.
 * @returns {object} { user, student }
 */
export const updateStudentById = async (studentId, updateData) => {
  const {
    name,
    classCode,
    semester,
    username,
    email,
    phoneNumber,
    imageFilename, // This will be null if no new file is uploaded
  } = updateData;

  // 1. Find the student and their user
  const student = await Student.findById(studentId);
  if (!student) {
    const error = new Error('Student not found.');
    error.statusCode = 404;
    throw error;
  }

  const user = await User.findById(student.user);
  if (!user) {
    const error = new Error('Associated user not found.');
    error.statusCode = 404;
    throw error;
  }

  // 2. Check for duplicate email/username
  // We must check if the new email/username belongs to *another* user.
  if (email) {
    const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
    if (emailExists) {
      const error = new Error('This email is already taken by another user.');
      error.statusCode = 400;
      throw error;
    }
    user.email = email;
  }
  if (username) {
    const usernameExists = await User.findOne({
      username,
      _id: { $ne: user._id },
    });
    if (usernameExists) {
      const error = new Error(
        'This username is already taken by another user.'
      );
      error.statusCode = 400;
      throw error;
    }
    user.username = username;
  }

  // 3. Update Class if provided
  if (classCode && semester) {
    const studentClass = await Class.findOne({ classCode, semester });
    if (!studentClass) {
      const error = new Error(
        `Class with code ${classCode} and semester ${semester} not found.`
      );
      error.statusCode = 404;
      throw error;
    }
    student.class = studentClass._id;
  }

  // 4. Update photo/embeddings if a new file was provided
  if (imageFilename) {
    // We use the student's existing rollNo (which we assume is immutable)
    const rollNo = student.rollNo;
    const mlUrl = `${process.env.ML_SERVICE_BASE_URL}/generate-embedding?student_id=${rollNo}&image_name=${imageFilename}`;
    console.log(`Calling ML Service for update: ${mlUrl}`);

    try {
      const { data } = await axios.get(mlUrl);
      if (!data || !data.faceEmbedding) {
        const error = new Error('ML service returned invalid data for update.');
        error.statusCode = 500;
        throw error;
      }
      student.faceEmbeddings = data.faceEmbedding;
    } catch (axiosError) {
      // Handle ML service error
      const mlErrorMessage =
        axiosError.response?.data?.detail || 'ML service call failed';
      const mlStatusCode = axiosError.response?.status || 500;
      const error = new Error(`ML Service Error: ${mlErrorMessage}`);
      error.statusCode = mlStatusCode;
      throw error;
    }
  }

  // 5. Update remaining simple fields
  if (name) student.name = name;
  if (phoneNumber) student.phoneNumber = phoneNumber;

  try {
    // 6. Save both documents
    const updatedStudent = await student.save();
    const updatedUser = await user.save();

    return { user: updatedUser, student: updatedStudent };
  } catch (dbError) {
    const error = new Error(`Database update failed: ${dbError.message}`);
    error.statusCode = 500;
    throw error;
  }
};

// --- GET STUDENTS FUNCTION ---

/**
 * @desc Gets all students, optionally filtered by classCode.
 * @param {object} filters - An object that can contain `classCode`.
 * @returns {object} { count, students }
 */
export const getStudents = async (filters = {}) => {
  const { classCode } = filters;

  const queryFilter = {};

  // If a classCode is provided, find the class _id first
  if (classCode) {
    const studentClass = await Class.findOne({ classCode });

    // If the class doesn't exist, return no students
    if (!studentClass) {
      const error = new Error(`Class with code ${classCode} not found.`);
      error.statusCode = 404;
      throw error;
    }

    // Use the found class _id for the filter
    queryFilter.class = studentClass._id;
  }

  try {
    const students = await Student.find(queryFilter)
      // Populate the 'user' field, select specific fields from User
      // Exclude password, and timestamps
      .populate({
        path: 'user',
        select: 'username email role profileId',
      })
      // Populate the 'class' field, exclude timestamps
      .populate({
        path: 'class',
        select: '-createdAt -updatedAt -__v',
      })
      // From the Student document, exclude timestamps and face embeddings
      .select('-createdAt -updatedAt -__v -faceEmbeddings');

    return {
      count: students.length,
      students: students,
    };
  } catch (dbError) {
    // Re-throw the error if it's one we created (like 404)
    if (dbError.statusCode) throw dbError;

    // Otherwise, create a new 500 error
    const error = new Error(`Database query failed: ${dbError.message}`);
    error.statusCode = 500;
    throw error;
  }
};

/**
 * Fetches all students belonging to a specific class.
 * We only select the fields needed for recognition.
 * @param {string} classId - The ObjectId of the class.
 * @returns {Promise<Array>} A list of students.
 */
async function getStudentsForClass(classId) {
  try {
    const students = await Student.find({ class: classId })
      .select('name rollNo faceEmbeddings')
      .lean(); // .lean() for faster, plain JS objects

    return students;
  } catch (error) {
    console.error(`Error fetching students for class ${classId}:`, error);
    throw new Error('Could not retrieve students from database.');
  }
}

/**
 * Gets the populated class details for a student.
 * @param {string} studentProfileId - The ObjectId of the student's profile.
 * @returns {Promise<Object>} The student's class details.
 */
async function getStudentClassDetails(studentProfileId) {
  const student = await Student.findById(studentProfileId)
    .populate({
      path: 'class',
      select: 'name department semester',
    })
    .select('class')
    .lean();

  if (!student || !student.class) {
    throw new Error('Student class details not found.');
  }
  return student.class;
}

/**
 * Gets all subjects for a student's class.
 * @param {string} studentProfileId - The ObjectId of the student's profile.
 * @returns {Promise<Array>} A list of subjects.
 */
async function getSubjectsForStudentClass(studentProfileId) {
  // 1. Find the student's class ID
  const student = await Student.findById(studentProfileId)
    .select('class')
    .lean();
  if (!student) {
    throw new Error('Student not found.');
  }

  // 2. Find all subjects for that class
  const subjects = await Subject.find({ class: student.class })
    .select('name subjectCode')
    .lean();

  return subjects;
}

export const studentService = {
  createNewStudent,
  deleteStudentById,
  updateStudentById,
  getStudents,
  getStudentsForClass,
  getStudentsForClass,
  getStudentClassDetails,
  getSubjectsForStudentClass,
  countStudents,
};
