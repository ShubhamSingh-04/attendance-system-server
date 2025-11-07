import { Class } from '../models/Class.js'; // Import Class model

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

export default {
  validateClassCodes,
};
