import { User } from '../models/User.js';

/**
 * Logs in an existing user.
 * @param {string} identifier - User's email OR username.
 * @param {string} password - User's plain-text password.
 * @returns {object} - The user object (without password) and a token.
 */
const loginUser = async (identifier, password) => {
  // 1. Find user by email OR username
  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }],
  });

  // 2. Check if user exists and password matches
  // We use the .matchPassword() method we defined on the user model
  if (user && (await user.matchPassword(password))) {
    // 3. Return user data and token
    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    };
  } else {
    // 4. If no match, throw an error
    throw new Error('Invalid credentials');
  }
};

export default {
  // registerUser,
  loginUser,
};
