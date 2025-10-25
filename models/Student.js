import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// Student Profile
const studentSchema = new Schema(
  {
    // Link to the main User account for login
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    rollNo: {
      type: String,
      required: true,
      unique: true,
    },
    // Link to their class/department
    class: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    semester: {
      type: Number,
      required: true,
    },
    phoneNumber: {
      type: String,
    },
    // As per your note, we store the embeddings, not the photo.
    // This will be an array of numbers.
    faceEmbeddings: {
      type: [Number],
      default: [],
    },
    // Subjects the student is enrolled in for the current semester
    enrolledSubjects: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Subject',
      },
    ],
  },
  { timestamps: true }
);

export const Student = model('Student', studentSchema);
