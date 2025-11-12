import asyncHandler from 'express-async-handler';
import { studentService } from '../services/studentService.js';
import { attendanceService } from '../services/attendanceService.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';

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

  // 1. Get student's ID from their authenticated profile
  const studentId = req.user.profileId;

  // If no filters provided, fetch ALL records for the student
  if (!subjectId || !date) {
    try {
      const records = await AttendanceRecord.find({ student: studentId })
        .populate({
          path: 'subject',
          select: 'name subjectCode',
        })
        .populate({
          path: 'markedBy',
          select: 'name',
        })
        .populate({
          path: 'student',
          select: 'name rollNo',
        })
        .select('-__v')
        .sort({ date: -1 });

      res.status(200).json({
        message: 'Records fetched successfully',
        count: records.length,
        records: records,
      });
    } catch (error) {
      res.status(500);
      throw error;
    }
    return;
  }

  // 2. Validate input if filters ARE provided
  if (!subjectId || !date) {
    res.status(400);
    throw new Error('Missing required query parameters: subjectId and date.');
  }

  // 3. Call the *new, efficient* service
  try {
    const records = await attendanceService.getStudentRecordsByDate(
      studentId,
      subjectId,
      date
    );

    // 4. Return the records (no filtering needed)
    res.status(200).json({
      message: 'Records fetched successfully',
      count: records.length,
      records: records,
    });
  } catch (error) {
    // If getStudentRecordsByDate throws a 404 (no records found),
    // return an empty list as requested.
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
