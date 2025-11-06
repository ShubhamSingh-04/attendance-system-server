import { User } from '../models/User.js'; // Adjust path as needed
import asyncHandler from 'express-async-handler';

/**
 * @desc    Get the profile of the currently logged-in user
 * @route   (used by) GET /api/admin/me, /api/teacher/me, /api/student/me
 * @access  Private (Admin, Teacher, or Student)
 */
const getSelfProfile = asyncHandler(async (req, res) => {
  //   console.log('user cont 11');
  const userId = req.user.id;

  // 1. Find the user first, WITHOUT populating
  const user = await User.findById(userId).select('-password');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Only attempt to populate if the role is one that HAS a profile model
  if (user.role === 'Teacher' || user.role === 'Student') {
    // We can safely populate now
    await user.populate('profileId');
  }

  // Send the response
  res.status(200).json({
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    // 'profile' will be the populated object (if Teacher/Student)
    // or null (if Admin)
    profile: user.profileId,
  });
});

export default { getSelfProfile };
