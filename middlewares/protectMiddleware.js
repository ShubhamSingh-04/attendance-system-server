import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import { User } from '../models/User.js';

/**
 * Middleware to protect routes.
 * It verifies the JWT token from the Authorization header.
 * If valid, it attaches the user object to req.user.
 * If invalid or missing, it returns a 401 Unauthorized error.
 */
const protect = asyncHandler(async (req, res, next) => {
  // console.log('Protect');
  let token;

  // Check for the 'Authorization' header and if it starts with 'Bearer'
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get the token from the header (e.g., "Bearer <token>")
      token = req.headers.authorization.split(' ')[1];

      // Verify the token using the secret key
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find the user by the ID stored in the token
      // and attach it to the request object (excluding the password)
      req.user = await User.findById(decoded.id).select('-password');
      // console.log('Protect: ', req.user);

      if (!req.user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      // Move on to the next middleware or the route handler
      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  // If no token is found at all
  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

export default { protect };
