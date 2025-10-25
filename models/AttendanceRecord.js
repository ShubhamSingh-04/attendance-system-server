import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// The core collection for storing daily attendance records
const attendanceRecordSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    // Time the class started or attendance was taken
    time: {
      type: String, // e.g., "09:00 AM"
    },
    status: {
      type: String,
      enum: ['Present', 'Absent'],
      required: true,
    },
  },
  { timestamps: true }
);

// Add a compound index to prevent duplicate attendance records
// for the same student, subject, and date.
attendanceRecordSchema.index(
  { student: 1, subject: 1, date: 1 },
  { unique: true }
);

export const AttendanceRecord = model(
  'AttendanceRecord',
  attendanceRecordSchema
);
