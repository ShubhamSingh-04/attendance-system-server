import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

// Get the base URL of your Python service from environment variables
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Calls the ML service to recognize students in a class photo.
 * @param {string} imageName - The filename of the saved class photo.
 * @param {Array} students - List of student objects from studentService.
 * @returns {Promise<Object>} The result from the ML service.
 */
async function recognizeStudents(imageName, students) {
  // 1. Format the student data to match the Pydantic model in FastAPI
  // We map `rollNo` (from Mongoose) to `usn` (for Python).
  const knownStudentsData = students.map((student) => ({
    usn: student.rollNo, // Mapping rollNo to usn
    faceEmbedding: student.faceEmbeddings,
  }));

  const endpoint = `${ML_SERVICE_URL}/recognize-students/${imageName}`;
  console.log(`[ML Service] Calling: POST ${endpoint}`);

  try {
    const response = await axios.post(endpoint, knownStudentsData);
    // response.data will be:
    // { faces_detected: 10, unrecognized_faces: 2, recognized_usns: [...] }
    return response.data;
  } catch (error) {
    console.error(`Error calling ML service: ${error.message}`);
    if (error.response) {
      // The request was made and the server responded with a non-2xx code
      console.error('ML Service Error Body:', error.response.data);
      throw new Error(
        `ML service failed: ${error.response.data.detail || error.message}`
      );
    }
    throw new Error(`Failed to connect to ML service: ${error.message}`);
  }
}

export const mlService = {
  recognizeStudents,
};
