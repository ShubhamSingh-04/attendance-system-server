import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// Represents a subject (e.g., "Data Structures", "Digital Logic")
const subjectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    subjectCode: {
      type: String,
      required: true,
      unique: true,
    },
    // Links to the class/department that offers this subject
    class: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
  },
  { timestamps: true }
);

export const Subject = model('Subject', subjectSchema);
