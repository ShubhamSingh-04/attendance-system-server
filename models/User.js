import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'; // Import bcrypt
const { Schema, model } = mongoose;

// --- Core Authentication Model ---
// A single User collection to handle login for all roles.
// Admin, Teacher, and Student profiles will link back to this.
const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      // Password will be hashed by bcrypt
    },
    role: {
      type: String,
      enum: ['admin', 'teacher', 'student'],
      required: true,
    },
    // This links the user account to their specific profile (Student or Teacher)
    // For Admins, this can be null.
    profileId: {
      type: Schema.Types.ObjectId,
      refPath: 'role', // Dynamically references either 'Student' or 'Teacher' model
    },
  },
  { timestamps: true }
);

// --- Mongoose Middleware (pre-save hook) ---
// This function will run before a 'save' operation on a User document.
userSchema.pre('save', async function (next) {
  // 'this' refers to the document being saved

  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next(); // Move to the next middleware
  }

  try {
    // Generate a salt (cost factor 10 is a good default)
    const salt = await bcrypt.genSalt(10);
    // Hash the password using the generated salt
    this.password = await bcrypt.hash(this.password, salt);
    next(); // Proceed with saving the document
  } catch (error) {
    next(error); // Pass any errors to the next middleware
  }
});

// --- Instance Method for Password Comparison ---
// Add a method to the User model to easily compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  // 'this.password' is the hashed password from the database
  // bcrypt.compare will securely compare the plain-text password with the hash
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = model('User', userSchema);
