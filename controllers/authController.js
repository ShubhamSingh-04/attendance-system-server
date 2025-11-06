import authService from '../services/auth.service.js';

/**
 * @desc    Authenticate user & get token (Login)
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  const { identifier, password } = req.body;

  // Basic validation
  if (!identifier || !password) {
    return res.status(400).json({
      error: 'Please provide identifier (email or username) and password',
    });
  }

  try {
    const loggedInUser = await authService.loginUser(identifier, password);
    res.status(200).json(loggedInUser); // 200 OK
  } catch (error) {
    // Handle errors from the service (e.g., "Invalid email or password")
    res.status(401).json({ error: error.message }); // 401 Unauthorized
  }
};

export default {
  // registerUser,
  loginUser,
};
