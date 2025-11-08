import mongoose from 'mongoose';
const { isValidObjectId } = mongoose;

import asyncHandler from 'express-async-handler';
import teacherService from '../services/teacherService.js';
import cameraService from '../services/cameraService.js';
import { studentService } from '../services/studentService.js';
import { mlService } from '../services/mlService.js';
import { attendanceService } from '../services/attendanceService.js';

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
// @route   GET /api/teacher/check-attendance/:classId/:subjectId/:roomId
// @access  Private (Teacher)
const checkAttendance = asyncHandler(async (req, res, next) => {
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

// @desc    Saves the final, confirmed attendance list to the DB
// @route   POST /api/teacher/mark-attendance
// @access  Private (Teacher)
const markAttendance = asyncHandler(async (req, res, next) => {
  // 1. Get data from the request body
  const { attendanceList, subjectId, date, time } = req.body;

  // 2. Get the teacher's ID from the authenticated user (req.user.profileId)
  const teacherId = req.user.profileId;
  if (!teacherId) {
    res.status(401);
    throw new Error(
      'Not authorized, no teacher profile associated with this user.'
    );
  }

  // 3. Basic validation
  if (!attendanceList || !subjectId || !date || !time) {
    res.status(400);
    throw new Error(
      'Missing required fields: attendanceList, subjectId, date, time'
    );
  }

  if (
    !Array.isArray(attendanceList) ||
    attendanceList.length === 0 ||
    !isValidObjectId(attendanceList[0]?._id) ||
    !['Present', 'Absent'].includes(attendanceList[0]?.status)
  ) {
    res.status(400);
    throw new Error(
      'Attendance list must be a non-empty array of { _id, status } objects.'
    );
  }

  // 4. Pass the data to the service to save it
  try {
    const savedRecords = await attendanceService.saveAttendanceRecords({
      attendanceList,
      subjectId,
      teacherId, // Pass the ID from the token
      date,
      time,
    });

    // 5. Respond with success
    res.status(201).json({
      message: 'Attendance marked successfully',
      count: savedRecords.length,
      records: savedRecords,
    });
  } catch (error) {
    // Let the service's error (like 409 Conflict) propagate
    res.status(error.statusCode || 500);
    throw error;
  }
});

/**
 * @desc    Get saved attendance records for a class, subject, and date
 * @route   GET /api/teacher/records
 * @access  Private (Teacher)
 */
const getAttendanceRecords = asyncHandler(async (req, res, next) => {
  const { classId, subjectId, date } = req.query;

  // 1. Validate input
  if (!classId || !subjectId || !date) {
    res.status(400);
    throw new Error(
      'Missing required query parameters: classId, subjectId and date.'
    );
  }

  // 2. Call the service
  try {
    const result = await attendanceService.getRecordsByDate(
      classId,
      subjectId,
      date
    );
    res.status(200).json({
      message: 'Records fetched successfully',
      stats: result.stats, // <-- Pass the new stats object
      count: result.records.length,
      records: result.records,
    });
  } catch (error) {
    res.status(error.statusCode || 500);
    throw error;
  }
});

/**
 * @desc    Get attendance summary for all students in a class for a subject
 * @route   GET /api/teacher/summary
 * @access  Private (Teacher)
 */
const getAttendanceSummary = asyncHandler(async (req, res, next) => {
  const { classId, subjectId } = req.query;

  // 1. Validate input
  if (!classId || !subjectId) {
    res.status(400);
    throw new Error(
      'Missing required query parameters: classId and subjectId.'
    );
  }

  // 2. Call the service
  try {
    const summary = await attendanceService.getAttendanceSummary(
      classId,
      subjectId
    );
    res.status(200).json({
      message: 'Summary fetched successfully',
      count: summary.length,
      summary: summary,
    });
  } catch (error) {
    res.status(error.statusCode || 500);
    throw error;
  }
});

/**
 * @desc    Update a single attendance record's status
 * @route   PUT /api/teacher/record/:id
 * @access  Private (Teacher)
 */
const updateAttendanceRecord = asyncHandler(async (req, res, next) => {
  const { id: recordId } = req.params;
  const { status } = req.body;
  const teacherId = req.user.profileId; // From protect middleware

  // 1. Validate input
  if (!status || !['Present', 'Absent'].includes(status)) {
    res.status(400);
    throw new Error('Invalid status. Must be "Present" or "Absent".');
  }

  // 2. Call the service
  try {
    const updatedRecord = await attendanceService.updateAttendanceRecord(
      recordId,
      status,
      teacherId
    );
    res.status(200).json({
      message: 'Record updated successfully',
      record: updatedRecord,
    });
  } catch (error) {
    res.status(error.statusCode || 500);
    throw error;
  }
});

export const teacherController = {
  getMyClasses,
  getMySubjects,
  checkAttendance,
  markAttendance,
  getAttendanceRecords,
  getAttendanceSummary,
  updateAttendanceRecord,
};
