import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { Student } from '../models/Student.js';
import { Subject } from '../models/Subject.js';
import mongoose from 'mongoose';

/**
 * Saves a batch of attendance records to the database.
 *
 * @param {Object} data
 * @param {Array} data.attendanceList - List of students and their status.
 * @param {string} data.subjectId - The ID of the subject.
 * @param {string} data.teacherId - The ID of the teacher marking attendance.
 * @param {string} data.date - The date of the class (e.g., "8/11/2025").
 * @param {string} data.time - The time of the class (e.g., "6:30:00 PM").
 * @returns {Promise<Object>} The result of the insert operation.
 */
async function saveAttendanceRecords({
  attendanceList,
  subjectId,
  teacherId,
  date,
  time,
}) {
  // 1. Map the frontend's list to the database schema
  const recordsToInsert = attendanceList.map((item) => ({
    student: item._id, // The student's ObjectId
    subject: subjectId,
    markedBy: teacherId,
    date: new Date(date), // Convert the date string back to a Date object
    time: time,
    status: item.status, // 'Present' or 'Absent'
  }));

  if (recordsToInsert.length === 0) {
    throw new Error('No attendance records to save.');
  }

  // 2. Insert all records in a single database transaction
  try {
    // `insertMany` is the most efficient way to save multiple documents
    const result = await AttendanceRecord.insertMany(recordsToInsert, {
      ordered: false, // Don't stop if one record fails (e.g., duplicate)
    });
    return result;
  } catch (error) {
    // 3. Handle duplicate key errors
    // This happens if the unique index (student + subject + date) is violated
    if (error.code === 11000) {
      console.warn(
        'Duplicate attendance marking attempt caught:',
        error.message
      );
      const err = new Error(
        'Attendance has already been marked for this subject on this date.'
      );
      err.statusCode = 409; // 409 Conflict
      throw err;
    }
    // Handle other insertion errors
    console.error('Error saving attendance:', error);
    throw new Error('An error occurred while saving the attendance records.');
  }
}

/**
 * Fetches attendance records for a specific class, subject, and date.
 * Populates student details and calculates percentages.
 * @param {string} classId - The ID of the class.
 * @param {string} subjectId - The ID of the subject.
 * @param {string} date - The date to query (e.g., "2025-11-08").
 * @returns {Promise<Object>} An object containing the list of records and stats.
 */
async function getRecordsByDate(classId, subjectId, date) {
  // 1. Find all students in the specified class
  const studentsInClass = await Student.find({ class: classId })
    .select('_id')
    .lean();

  if (!studentsInClass || studentsInClass.length === 0) {
    const err = new Error('No students found for this class.');
    err.statusCode = 404;
    throw err;
  }
  // Get an array of just the student IDs
  const studentIds = studentsInClass.map((s) => s._id);

  // 2. Create a date range for the entire day
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  // 3. Find records matching subject, date range, AND the list of students
  const records = await AttendanceRecord.find({
    subject: subjectId,
    date: {
      $gte: startDate,
      $lte: endDate,
    },
    student: { $in: studentIds }, // <-- Filter by students in the class
  })
    .populate({
      path: 'student',
      select: 'name rollNo', // Only get the student's name and roll number
    })
    .populate({
      path: 'markedBy',
      select: 'name', // Get the teacher's name
    })
    .select('student status date time') // Select the fields we need
    .lean();

  if (!records || records.length === 0) {
    const err = new Error(
      'No attendance records found for this class, subject, and date.'
    );
    err.statusCode = 404;
    throw err;
  }

  // 4. Calculate stats
  const totalStudents = records.length;
  const presentCount = records.filter((r) => r.status === 'Present').length;
  const absentCount = totalStudents - presentCount;
  const presentPercentage = (presentCount / totalStudents) * 100;
  const absentPercentage = (absentCount / totalStudents) * 100;

  return {
    records: records,
    stats: {
      total: totalStudents,
      present: presentCount,
      absent: absentCount,
      presentPercentage: presentPercentage.toFixed(1), // "80.0"
      absentPercentage: absentPercentage.toFixed(1), // "20.0"
    },
  };
}

/**
 * Generates a full attendance summary for every student in a class
 * for a specific subject.
 * @param {string} classId - The ID of the class.
 * @param {string} subjectId - The ID of the subject.
 * @returns {Promise<Array>} A list of students with their attendance stats.
 */
async function getAttendanceSummary(classId, subjectId) {
  // 1. Get all students in the class
  const allStudents = await Student.find({ class: classId })
    .select('name rollNo') // Get basic info
    .lean();

  if (!allStudents || allStudents.length === 0) {
    const err = new Error('No students found for this class.');
    err.statusCode = 404;
    throw err;
  }
  const studentIds = allStudents.map((s) => s._id);

  // 2. Run an aggregation to count attendance for all these students
  const stats = await AttendanceRecord.aggregate([
    {
      // Find all records for the specified subject AND students
      $match: {
        subject: new mongoose.Types.ObjectId(subjectId),
        student: { $in: studentIds },
      },
    },
    {
      // Group the records by student ID
      $group: {
        _id: '$student', // Group by the 'student' field
        presentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] },
        },
        absentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] },
        },
      },
    },
  ]);

  // 3. Create a lookup map for efficient merging
  const statsMap = new Map();
  for (const stat of stats) {
    statsMap.set(stat._id.toString(), {
      present: stat.presentCount,
      absent: stat.absentCount,
      total: stat.presentCount + stat.absentCount,
    });
  }

  // 4. Combine the full student list with the calculated stats
  const summaryList = allStudents.map((student) => {
    const studentStats = statsMap.get(student._id.toString());

    let present = 0;
    let absent = 0;
    let total = 0;
    let presentPercentage = 0.0;
    let absentPercentage = 0.0;

    // If stats were found for this student, use them
    if (studentStats && studentStats.total > 0) {
      present = studentStats.present;
      absent = studentStats.absent;
      total = studentStats.total;
      presentPercentage = (present / total) * 100;
      absentPercentage = (absent / total) * 100;
    }

    return {
      _id: student._id,
      name: student.name,
      rollNo: student.rollNo,
      present: present,
      absent: absent,
      totalClasses: total,
      presentPercentage: presentPercentage.toFixed(1), // "80.0"
      absentPercentage: absentPercentage.toFixed(1), // "20.0"
    };
  });

  return summaryList;
}

/**
 * Updates the status of a single attendance record.
 * Ensures that only the teacher who marked the record can update it.
 * @param {string} recordId - The _id of the attendance record to update.
 * @param {string} newStatus - The new status ("Present" or "Absent").
 * @param {string} teacherId - The profile ID of the teacher making the request.
 * @returns {Promise<Document>} The updated attendance record.
 */
async function updateAttendanceRecord(recordId, newStatus, teacherId) {
  try {
    // Find the record by its ID AND where markedBy matches the teacherId.
    // Update its status.
    const updatedRecord = await AttendanceRecord.findOneAndUpdate(
      {
        _id: recordId,
        markedBy: teacherId, // <-- Security check!
      },
      {
        $set: { status: newStatus },
      },
      {
        new: true, // Return the modified document
      }
    )
      .populate({
        path: 'student',
        select: 'name rollNo',
      })
      .populate({
        path: 'markedBy',
        select: 'name',
      });

    // If record is null, it means either:
    // 1. The record ID doesn't exist (404)
    // 2. The teacherId didn't match (403)
    if (!updatedRecord) {
      const err = new Error(
        'Record not found or you do not have permission to edit it.'
      );
      err.statusCode = 404; // Use 404 to avoid leaking permission info
      throw err;
    }

    return updatedRecord;
  } catch (error) {
    console.error('Error updating attendance record:', error);
    if (error.statusCode) throw error; // Re-throw our custom error
    throw new Error('An error occurred while updating the record.');
  }
}

/**
 * Generates an attendance summary for a single student across ALL their subjects.
 * @param {string} studentProfileId - The _id of the student's profile.
 * @param {string} classId - The _id of the student's class.
 * @returns {Promise<Array>} A list of subjects with attendance stats.
 */
async function getStudentAttendanceSummary(studentProfileId, classId) {
  // 1. Get all subjects for the student's class
  const allSubjects = await Subject.find({ class: classId })
    .select('name subjectCode')
    .lean();

  if (!allSubjects || allSubjects.length === 0) {
    return []; // No subjects for this class, return empty summary
  }

  // 2. Run an aggregation to count attendance for this ONE student
  //    but grouped by EACH subject.
  const stats = await AttendanceRecord.aggregate([
    {
      // Find all records for this student
      $match: {
        student: new mongoose.Types.ObjectId(studentProfileId),
      },
    },
    {
      // Group the records by subject ID
      $group: {
        _id: '$subject', // Group by the 'subject' field
        presentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] },
        },
        absentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] },
        },
      },
    },
  ]);

  // 3. Create a lookup map for efficient merging
  // statsMap key: subjectId (string)
  const statsMap = new Map();
  for (const stat of stats) {
    const total = stat.presentCount + stat.absentCount;
    statsMap.set(stat._id.toString(), {
      present: stat.presentCount,
      absent: stat.absentCount,
      totalClasses: total,
      presentPercentage: ((stat.presentCount / total) * 100).toFixed(1),
      absentPercentage: ((stat.absentCount / total) * 100).toFixed(1),
    });
  }

  // 4. Combine the full subject list with the calculated stats
  const summaryList = allSubjects.map((subject) => {
    const subjectStats = statsMap.get(subject._id.toString());

    // If no stats found (e.g., no classes yet), return default
    if (!subjectStats) {
      return {
        ...subject, // { _id, name, subjectCode }
        present: 0,
        absent: 0,
        totalClasses: 0,
        presentPercentage: '0.0',
        absentPercentage: '0.0',
      };
    }

    // If stats were found, combine them
    return {
      ...subject,
      ...subjectStats,
    };
  });

  return summaryList;
}

export const attendanceService = {
  saveAttendanceRecords,
  getRecordsByDate,
  getAttendanceSummary,
  updateAttendanceRecord,
  getStudentAttendanceSummary,
};
