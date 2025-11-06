import express from 'express';
const router = express.Router();
import protectMiddleware from '../middlewares/protectMiddleware.js';
import roleMiddleware from '../middlewares/roleMiddleware.js';
import userController from '../controllers/userController.js';

router.use(protectMiddleware.protect);
router.use(roleMiddleware.isAdmin);

router.get('/me', userController.getSelfProfile);

export default router;
