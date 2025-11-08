import asyncHandler from 'express-async-handler';
import { studentService } from '../services/studentService.js';
import { attendanceService } from '../services/attendanceService.js';

/**
 * @desc    Get the logged-in student's class details
 * @route   GET /api/student/my-class
 * @access  Private (Student)
 */
const getMyClass = asyncHandler(async (req, res) => {
  // req.user.profileId is the Student's _id
  try {
    const classDetails = await studentService.getStudentClassDetails(
      req.user.profileId
    );
    res.status(200).json(classDetails);
  } catch (error) {
    res.status(404);
    throw new Error(error.message);
  }
});

/**
 * @desc    Get all subjects for the logged-in student's class
 * @route   GET /api/student/my-subjects
 * @access  Private (Student)
 */
const getMySubjects = asyncHandler(async (req, res) => {
  try {
    const subjects = await studentService.getSubjectsForStudentClass(
      req.user.profileId
    );
    res.status(200).json(subjects);
  } catch (error) {
    res.status(404);
    throw new Error(error.message);
  }
});

/**
 * @desc    Get the logged-in student's attendance records for a subject/date
 * @route   GET /api/student/my-records
 * @access  Private (Student)
 */
const getMyAttendanceRecords = asyncHandler(async (req, res) => {
  const { subjectId, date } = req.query;

  // 1. Get student's classId from their profile
  const studentClass = await studentService.getStudentClassDetails(
    req.user.profileId
  );
  const classId = studentClass._id;

  // 2. Validate input
  if (!subjectId || !date) {
    res.status(400);
    throw new Error('Missing required query parameters: subjectId and date.');
  }

  // 3. Call the *reusable* service
  try {
    const result = await attendanceService.getRecordsByDate(
      classId,
      subjectId,
      date
    );

    // 4. Filter the results to only include the current student
    //    *** THIS IS THE FIX ***
    //    We must convert both req.user.profileId and the record's student ID
    //    to strings for a reliable comparison.
    const myRecords = result.records.filter(
      (record) =>
        record.student._id.toString() === req.user.profileId.toString()
    );

    res.status(200).json({
      message: 'Records fetched successfully',
      count: myRecords.length,
      records: myRecords,
    });
  } catch (error) {
    // If getRecordsByDate throws a 404 (no records found at all),
    // it's better to return an empty list for the student.
    if (error.statusCode === 404) {
      res.status(200).json({
        message: 'No records found for this date.',
        count: 0,
        records: [],
      });
    } else {
      // Handle other errors
      res.status(error.statusCode || 500);
      throw error;
    }
  }
});

/**
 * @desc    Get the logged-in student's attendance summary for ALL subjects
 * @route   GET /api/student/my-summary
 * @access  Private (Student)
 */
const getMyAttendanceSummary = asyncHandler(async (req, res) => {
  // 1. Get student's classId from their profile
  const studentClass = await studentService.getStudentClassDetails(
    req.user.profileId
  );
  const classId = studentClass._id;

  // 2. Call the new summary service
  try {
    const summary = await attendanceService.getStudentAttendanceSummary(
      req.user.profileId,
      classId
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

export const studentController = {
  getMyClass,
  getMySubjects,
  getMyAttendanceRecords,
  getMyAttendanceSummary,
};
