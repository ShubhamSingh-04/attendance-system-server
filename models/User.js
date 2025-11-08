import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'; // Import bcrypt
const { Schema, model } = mongoose;

// --- Core Authentication Model ---
const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      // unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      // unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: true,
      // Password will be hashed by bcrypt
    },
    role: {
      type: String,
      enum: ['Admin', 'Teacher', 'Student'],
      required: true,
    },
    // For Admins, this can be null.
    profileId: {
      type: Schema.Types.ObjectId,
      refPath: 'role', // Dynamically references either 'Student' or 'Teacher' model
    },
  },
  { timestamps: true }
);

// --- Mongoose Middleware (pre-save hook) ---
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next(); // Move to the next middleware
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error); // Pass any errors to the next middleware
  }
});

// --- Instance Method for Password Comparison ---
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

export const User = model('User', userSchema);
