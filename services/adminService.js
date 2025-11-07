import mongoose from 'mongoose';
import { User } from '../models/User.js'; // Assuming models are in a 'models' directory
import { Teacher } from '../models/Teacher.js'; // Assuming models are in a 'models' directory

import subjectService from './subjectService.js';
import classService from './classService.js';

const getAllTeachers = async () => {
  try {
    const teachers = await Teacher.find({})
      .populate('user', '-password') // Populate user data, exclude password
      .populate('subjects') // Populate the full subject documents
      .populate('assignedClasses') // Populate the full class documents
      .sort({ createdAt: -1 }); // Optional: sort by newest first

    return teachers;
  } catch (error) {
    console.error('Error fetching all teachers:', error);
    throw new Error('Error fetching teachers from database.');
  }
};

/**
 * Creates a new Teacher without using database transactions.
 * Implements a manual rollback if creation fails.
 */
const addTeacher = async (teacherData) => {
  const {
    username,
    email,
    password,
    teacherID,
    name,
    subjects: subjectCodes,
    assignedClasses: classCodes,
  } = teacherData;

  // --- 1. Validation Step (No Session) ---
  const subjectIds = await subjectService.validateSubjectCodes(subjectCodes);
  const classIds = await classService.validateClassCodes(classCodes);

  // --- 2. Create User (No Session) ---
  const newUser = new User({
    username,
    email,
    password,
    role: 'Teacher',
  });
  const savedUser = await newUser.save();

  let savedTeacher;

  try {
    // --- 3. Create Teacher (No Session) ---
    const newTeacher = new Teacher({
      user: savedUser._id,
      teacherID,
      name,
      subjects: subjectIds,
      assignedClasses: classIds,
    });
    savedTeacher = await newTeacher.save();

    // --- 4. Link User to Teacher Profile ---
    savedUser.profileId = savedTeacher._id;
    await savedUser.save();

    // --- 5. Populate and Return ---
    const populatedTeacher = await Teacher.findById(savedTeacher._id).populate(
      'user',
      '-password'
    );
    return populatedTeacher;
  } catch (error) {
    // ---!! MANUAL ROLLBACK !! ---
    // If teacher creation fails, delete the user we just created.
    if (savedUser) {
      await User.findByIdAndDelete(savedUser._id);
    }
    // Re-throw the error to be caught by the controller
    console.error('Error creating teacher profile, rolling back user:', error);
    if (error.code === 11000) {
      // Handle duplicate key error from Teacher model (e.g., teacherID)
      const duplicateKey = Object.keys(error.keyValue)[0];
      throw new Error(`A teacher with this ${duplicateKey} already exists.`);
    }
    throw error;
  }
};

/**
 * Edits an existing Teacher and their associated User account.
 * Implements a manual rollback if the second save fails.
 */
const editTeacher = async (teacherId, updateData) => {
  const {
    username,
    email,
    password,
    teacherID,
    name,
    subjects: subjectCodes, // Renaming for clarity
    assignedClasses: classCodes, // Renaming for clarity
  } = updateData; // --- 1. Find Documents ---

  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new Error('Teacher not found.');
  }

  const user = await User.findById(teacher.user);
  if (!user) {
    // This indicates a data integrity issue but should be handled
    throw new Error('Associated user account not found.');
  } // --- 2. Store Original Data for Rollback ---

  const originalUser = {
    username: user.username,
    email: user.email,
  }; // Note: Password cannot be rolled back after hashing. // This non-transactional pattern has limitations.
  // --- 3. Validation Step ---
  let subjectIdsToSet = teacher.subjects; // Only validate/update if 'subjects' key was provided (even if it's [])
  if (subjectCodes !== undefined) {
    subjectIdsToSet = await subjectService.validateSubjectCodes(subjectCodes);
  }

  let classIdsToSet = teacher.assignedClasses; // Only validate/update if 'assignedClasses' key was provided
  if (classCodes !== undefined) {
    classIdsToSet = await classService.validateClassCodes(classCodes);
  } // --- 4. Update User (First operation) ---

  try {
    if (username) user.username = username;
    if (email) user.email = email;
    if (password) user.password = password; // pre-save hook will hash // Only save if a relevant field was changed

    if (username || email || password) {
      await user.save();
    }
  } catch (userError) {
    console.error('Error saving user, no rollback needed yet:', userError);
    if (userError.code === 11000) {
      const duplicateKey = Object.keys(userError.keyValue)[0];
      throw new Error(`A user with this ${duplicateKey} already exists.`);
    }
    throw userError; // Re-throw other user save errors
  } // --- 5. Update Teacher (Second operation) ---

  try {
    if (teacherID) teacher.teacherID = teacherID;
    if (name) teacher.name = name; // Set the new (or original) validated IDs

    teacher.subjects = subjectIdsToSet;
    teacher.assignedClasses = classIdsToSet;

    await teacher.save(); // --- 6. Populate and Return ---

    const populatedTeacher = await Teacher.findById(teacher._id).populate(
      'user',
      '-password'
    );
    return populatedTeacher;
  } catch (teacherError) {
    // ---!! MANUAL ROLLBACK (User) !! ---
    // If teacher update fails, roll back the user update.
    console.warn('Error saving teacher, rolling back user update...');
    user.username = originalUser.username;
    user.email = originalUser.email; // We cannot un-hash/roll back the password.
    if (password) {
      console.error(
        'CRITICAL: Password was changed but cannot be rolled back.'
      );
    } // Save the user back to original state, skipping validation
    await user.save({ validateBeforeSave: false });

    console.error(
      'Error updating teacher profile, user rolled back:',
      teacherError
    );
    if (teacherError.code === 11000) {
      const duplicateKey = Object.keys(teacherError.keyValue)[0];
      throw new Error(`A teacher with this ${duplicateKey} already exists.`);
      T;
    }
    throw teacherError; // Re-throw the original error
  }
};

const deleteTeacher = async (teacherId) => {
  // --- 1. Find Teacher Profile ---
  // We must find the teacher first to get the associated user's ID.
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new Error('Teacher not found.');
  }

  const userId = teacher.user; // Get the ID of the associated user

  // --- 2. Delete Teacher Profile --- // Delete the specific teacher profile
  await Teacher.findByIdAndDelete(teacherId); // --- 3. Delete Associated User Account --- // Now, delete the core user account

  const deletedUser = await User.findByIdAndDelete(userId);

  if (!deletedUser) {
    // This is a data integrity issue, but the primary task (deleting the teacher)
    // is done. We should log this for monitoring.
    console.warn(
      `Data Integrity Warning: Teacher profile ${teacherId} was deleted, but the associated user account ${userId} was not found in the User collection.`
    );
  } // No return value is needed; success is implied if no error is thrown.
};
// ---------------------------------

export const adminService = {
  getAllTeachers,
  addTeacher,
  editTeacher,
  deleteTeacher,
};
