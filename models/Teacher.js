import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// Teacher Profile
const teacherSchema = new Schema(
  {
    // Link to the main User account for login
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    teacherID: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    // Subjects this teacher is assigned to teach
    subjects: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Subject',
      },
    ],
  },
  { timestamps: true }
);

export const Teacher = model('Teacher', teacherSchema);
