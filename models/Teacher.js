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

    assignedClasses: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Class',
      },
    ],
  },
  { timestamps: true }
);

// --- Indexes ---
teacherSchema.index({ user: 1 }, { unique: true });
teacherSchema.index({ teacherID: 1 }, { unique: true });
teacherSchema.index({ name: 1 });
teacherSchema.index({ subjects: 1 });
teacherSchema.index({ assignedClasses: 1 });

export const Teacher = model('Teacher', teacherSchema);
