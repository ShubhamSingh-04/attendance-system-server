import jwt from 'jsonwebtoken';

/**
 * Generates a JSON Web Token (JWT) for a given user ID.
 * @param {string} id - The user's MongoDB document ID.
 * @returns {string} - The signed JWT.
 */
const generateToken = (id) => {
  // process.env.JWT_SECRET should be a long, random string
  // stored in your .env file
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Token expires in 30 days
  });
};

export default generateToken;
