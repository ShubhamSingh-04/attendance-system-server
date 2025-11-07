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
  },
  { timestamps: true }
);

export const Subject = model('Subject', subjectSchema);
