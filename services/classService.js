import { Class } from '../models/Class.js';
import { Subject } from '../models/Subject.js';

/**
 * Validates a list of class codes and returns their ObjectIds.
 * Throws an error if any codes are not found.
 */
const validateClassCodes = async (classCodes) => {
  if (!classCodes || classCodes.length === 0) {
    return [];
  }
  // Find classes *without* a session
  const foundClasses = await Class.find({
    classCode: { $in: classCodes },
  });

  if (foundClasses.length !== classCodes.length) {
    const foundCodes = foundClasses.map((c) => c.classCode);
    const notFoundCodes = classCodes.filter(
      (code) => !foundCodes.includes(code)
    );
    throw new Error(`Invalid class codes: ${notFoundCodes.join(', ')}`);
  }
  return foundClasses.map((c) => c._id);
};

/**
 * @desc    Get all classes
 */
export const getAllClasses = async () => {
  const classes = await Class.find({}, { updatedAt: 0, createdAt: 0, __v: 0 });
  return classes;
};

/**
 * @desc    Add a new class
 * @param   {object} classData - Data for the new class
 */
export const addClass = async (classData) => {
  const { name, classCode, semester } = classData;

  // 1. Basic validation
  if (!name || !classCode) {
    throw new Error('Missing required fields: name and classCode.');
  }

  // 2. Check for duplicate name or classCode
  const duplicate = await Class.findOne({ $or: [{ name }, { classCode }] });
  if (duplicate) {
    const duplicateKey = duplicate.name === name ? 'name' : 'classCode';
    throw new Error(`A class with this ${duplicateKey} already exists.`);
  }

  // 3. Create and save the new class
  const newClass = new Class({
    name,
    classCode,
    semester, // This is optional and will be null if not provided
  });

  await newClass.save();
  return newClass;
};

/**
 * @desc    Delete a class by its ID
 * @param   {string} classId - The ID of the class to delete
 */
export const deleteClass = async (classId) => {
  // 1. Find the class
  const classToDelete = await Class.findById(classId);
  if (!classToDelete) {
    throw new Error('Class not found.');
  }

  // 2. Check if any subjects are referencing this class
  const subjectCount = await Subject.countDocuments({ class: classId });
  if (subjectCount > 0) {
    throw new Error(
      `Cannot delete class "${classToDelete.name}". It is referenced by ${subjectCount} subject(s).`
    );
  }

  // 3. If no references, proceed with deletion
  await Class.findByIdAndDelete(classId);

  return { message: 'Class deleted successfully.' };
};

export const classService = {
  validateClassCodes,
  deleteClass,
  addClass,
  getAllClasses,
};
