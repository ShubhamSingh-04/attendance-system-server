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
      // unique: true,
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
    // Link to their class/department & semester
    class: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
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
  },
  { timestamps: true }
);

// --- Indexes ---
studentSchema.index({ user: 1 }, { unique: true });
studentSchema.index({ rollNo: 1 }, { unique: true });
studentSchema.index({ class: 1 });
studentSchema.index({ semester: 1 });
studentSchema.index({ enrolledSubjects: 1 });
studentSchema.index({ name: 1 });

export const Student = model('Student', studentSchema);
