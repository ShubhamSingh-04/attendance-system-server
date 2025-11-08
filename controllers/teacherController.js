import asyncHandler from 'express-async-handler';
import teacherService from '../services/teacherService.js';
import cameraService from '../services/cameraService.js';
import { studentService } from '../services/studentService.js';
import { mlService } from '../services/mlService.js';

/**
 * @desc    Get all classes assigned to the logged-in teacher
 * @route   GET /api/teacher/my-classes
 * @access  Private (Teacher)
 */
const getMyClasses = asyncHandler(async (req, res) => {
  // The user's profileId (which is the Teacher _id) is attached by protectMiddleware
  const teacherProfileId = req.user.profileId;

  const classes = await teacherService.fetchMyClasses(teacherProfileId);

  res.status(200).json({
    count: classes.length,
    classes,
  });
});

/**
 * @desc    Get all subjects assigned to the logged-in teacher (with details)
 * @route   GET /api/teacher/my-subjects
 * @access  Private (Teacher)
 */
const getMySubjects = asyncHandler(async (req, res) => {
  // Get the Teacher _id from the authenticated user
  const teacherProfileId = req.user.profileId;

  const subjects = await teacherService.fetchMySubjects(teacherProfileId);

  res.status(200).json({
    count: subjects.length,
    subjects,
  });
});

// @desc    Mark attendance by taking a snapshot and recognizing students
// @route   GET /api/teacher/mark-attendance/:classId/:subjectId/:roomId
// @access  Private (Teacher)
const markAttendance = asyncHandler(async (req, res, next) => {
  const { classId, subjectId, roomId } = req.params;

  // --- Step 1 & 2: Get snapshot from camera and save it ---
  let imageName;
  try {
    imageName = await cameraService.getSnapshotFromCamera(
      roomId,
      classId,
      subjectId
    );
  } catch (error) {
    console.error('Failed to get snapshot:', error);
    res.status(500);
    throw new Error(`Failed to get camera snapshot: ${error.message}`);
  }

  // --- Step 3: Fetch all students for the class ---
  const allStudents = await studentService.getStudentsForClass(classId);
  if (allStudents.length === 0) {
    res.status(404);
    throw new Error('No students found for this class.');
  }

  // Filter for students who actually have embeddings to check
  const studentsWithEmbeddings = allStudents.filter(
    (s) => s.faceEmbeddings && s.faceEmbeddings.length > 0
  );
  if (studentsWithEmbeddings.length === 0) {
    res.status(400);
    throw new Error('No students in this class have registered face data.');
  }

  // --- Step 4: Call ML service ---
  const mlResult = await mlService.recognizeStudents(
    imageName,
    studentsWithEmbeddings
  );
  // mlResult = { faces_detected, unrecognized_faces, recognized_usns: [...] }

  // --- Step 5 & 6: Format the response for the frontend ---
  const recognizedUsns = new Set(mlResult.recognized_usns);

  const attendanceList = allStudents.map((student) => {
    // Check if the student's rollNo is in the recognized set
    const status = recognizedUsns.has(student.rollNo) ? 'Present' : 'Absent';

    return {
      _id: student._id,
      name: student.name,
      rollNo: student.rollNo, // 'rollNo' from your schema
      status: status,
    };
  });

  // Send the full report to the frontend for review
  res.json({
    stats: {
      faces_detected: mlResult.faces_detected,
      unrecognized_faces: mlResult.unrecognized_faces,
      students_present: recognizedUsns.size,
      students_absent: allStudents.length - recognizedUsns.size,
    },
    attendanceList: attendanceList,
  });
});

// Export all controller functions
export default {
  getMyClasses,
  getMySubjects,
  markAttendance,
};
