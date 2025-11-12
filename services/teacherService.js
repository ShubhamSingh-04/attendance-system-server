import { Teacher } from '../models/Teacher.js';

// We need to import the other models so Mongoose can populate them
import { Class } from '../models/Class.js';
import { Subject } from '../models/Subject.js';

/**
 * Counts the total number of teacher profiles.
 * @returns {Promise<number>} The total count of teachers.
 */
async function countTeachers() {
  try {
    const count = await Teacher.countDocuments({});
    return count;
  } catch (error) {
    console.error('Error counting teachers:', error);
    throw new Error('Could not retrieve teacher count.');
  }
}

/**
 * Fetches the populated list of assigned classes for a specific teacher.
 * @param {string} teacherProfileId - The _id of the Teacher document.
 * @returns {Promise<Array>} A promise that resolves to an array of Class documents.
 */
const fetchMyClasses = async (teacherProfileId) => {
  const teacher = await Teacher.findById(teacherProfileId)
    .select('assignedClasses') // Only fetch the 'assignedClasses' field
    .populate({
      path: 'assignedClasses', // Populate the array
      model: 'Class',
    });

  if (!teacher) {
    // This should technically not happen if they are authenticated, but good to check
    throw new Error('Teacher profile not found.');
  }

  // Return just the array of classes
  return teacher.assignedClasses;
};

/**
 * Fetches the populated list of assigned subjects for a specific teacher.
 * This also populates the 'class' details inside each subject.
 * @param {string} teacherProfileId - The _id of the Teacher document.
 * @returns {Promise<Array>} A promise that resolves to an array of Subject documents.
 */
const fetchMySubjects = async (teacherProfileId) => {
  const teacher = await Teacher.findById(teacherProfileId)
    .select('subjects') // Only fetch the 'subjects' field
    .populate({
      path: 'subjects', // Populate the 'subjects' array
      model: 'Subject',
      populate: {
        path: 'class', // ...and WITHIN each subject, populate its 'class'
        model: 'Class',
      },
    });

  if (!teacher) {
    throw new Error('Teacher profile not found.');
  }

  // Return just the array of fully populated subjects
  return teacher.subjects;
};

export default {
  fetchMyClasses,
  fetchMySubjects,
  countTeachers,
};
