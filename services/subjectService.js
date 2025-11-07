import { Subject } from '../models/Subject.js'; // Import Subject model

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

export default {
  validateSubjectCodes,
};
