import { User } from '../models/User.js'; // Adjust path as needed
import asyncHandler from 'express-async-handler';

/**
 * @desc    Get the profile of the currently logged-in user
 * @route   (used by) GET /api/admin/me, /api/teacher/me, /api/student/me
 * @access  Private (Admin, Teacher, or Student)
 */
const getSelfProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // 1. Find the user first, WITHOUT populating
  const user = await User.findById(userId).select('-password');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // 2. Conditionally populate based on role
  if (user.role === 'Teacher') {
    // --- UPDATED LOGIC ---
    // If it's a Teacher, populate their profile...
    await user.populate({
      path: 'profileId', // The field in the User model
      // ...and inside that profile, populate these fields:
      populate: [
        {
          path: 'assignedClasses', // Populates the array of Class documents
          model: 'Class',
        },
        {
          path: 'subjects', // Populates the array of Subject documents
          model: 'Subject',
          // ...and inside EACH subject, populate its class details
          populate: {
            path: 'class',
            model: 'Class',
          },
        },
      ],
    });
  } else if (user.role === 'Student') {
    // If it's a Student, populate their profile...
    await user.populate({
      path: 'profileId', // The field in the User model
      // ...and inside that profile, populate their class:
      populate: {
        path: 'class', // The field in the StudentProfile model
        model: 'Class',
      },
    });
  }
  // If role is 'Admin', user.profileId is null, so we do nothing.

  // 3. Send the response
  res.status(200).json({
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    // 'profile' will be the fully populated object (if Teacher/Student)
    // or null (if Admin)
    profile: user.profileId,
  });
});

export default { getSelfProfile };
