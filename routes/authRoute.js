import express from 'express';
import authController from '../controllers/authController.js';

const router = express.Router();

// @route   POST /api/auth/login
router.post('/login', authController.loginUser);

export default router;
