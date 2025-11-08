import { Subject } from '../models/Subject.js'; // Import Subject model
import { Class } from '../models/Class.js';

/**
 * Validates a list of subject codes and returns their ObjectIds.
 * Throws an error if any codes are not found.
 */

const validateSubjectCodes = async (subjectCodes) => {
  if (!subjectCodes || subjectCodes.length === 0) {
    return [];
  }
  const foundSubjects = await Subject.find({
    subjectCode: { $in: subjectCodes },
  });

  if (foundSubjects.length !== subjectCodes.length) {
    const foundCodes = foundSubjects.map((s) => s.subjectCode);
    const notFoundCodes = subjectCodes.filter(
      (code) => !foundCodes.includes(code)
    );
    throw new Error(`Invalid subject codes: ${notFoundCodes.join(', ')}`);
  }
  return foundSubjects.map((s) => s._id);
};

/**
 * @desc    Get all subjects and populate class info
 */
const getAllSubjects = async () => {
  // Find all subjects
  // Populate the 'class' field
  // We specify 'name' and 'department' (or any fields you want) from the Class model
  const subjects = await Subject.find(
    {},
    { __v: 0, updatedAt: 0, createdAt: 0 }
  ).populate('class', { name: 1, classCode: 1 });

  if (!subjects) {
    return [];
  }
  return subjects;
};

/**
 * @desc    Add a new subject
 * @param   {object} subjectData - Data for the new subject
 */
export const addSubject = async (subjectData) => {
  // 1. Destructure classCode from the 'class' property in the request
  const { name, subjectCode, classCode } = subjectData;

  // 2. Basic validation - check for classCode, not classId
  if (!name || !subjectCode || !classCode) {
    throw new Error(
      'Missing required fields: name, subjectCode, and class (as classCode).'
    );
  }

  // 3. Check if the class exists using its classCode
  const existingClass = await Class.findOne({ classCode });
  if (!existingClass) {
    throw new Error(`Class with classCode "${classCode}" not found.`);
  }

  // 4. Check if subject code is already in use
  const duplicateSubject = await Subject.findOne({ subjectCode });
  if (duplicateSubject) {
    throw new Error('A subject with this subjectCode already exists.');
  }

  // 5. Create and save the new subject
  const newSubject = new Subject({
    name,
    subjectCode,
    class: existingClass._id, // Use the _id from the class we found
  });

  await newSubject.save();

  // 6. Populate the class info before returning (optional, but good practice)
  const populatedSubject = await Subject.findById(newSubject._id, {
    createdAt: 0,
    __v: 0,
    updatedAt: 0,
  }).populate(
    'class',
    { name: 1, classCode: 1, name: 1 } // Use the same projection as getAllSubjects
  );

  return populatedSubject;
};

/**
 * @desc    Delete a subject by its ID
 * @param   {string} subjectId - The ID of the subject to delete
 */
const deleteSubject = async (subjectId) => {
  const subject = await Subject.findById(subjectId);

  if (!subject) {
    throw new Error('Subject not found.');
  }

  // You might add logic here to check if this subject is being used
  // in a timetable before deleting, but for now, we'll just delete it.

  await Subject.findByIdAndDelete(subjectId);

  return { message: 'Subject deleted successfully.' };
};

export const subjectService = {
  validateSubjectCodes,
  deleteSubject,
  addSubject,
  getAllSubjects,
};
