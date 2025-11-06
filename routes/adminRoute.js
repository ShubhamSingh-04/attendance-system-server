import express from 'express';
const router = express.Router();
import protectMiddleware from '../middlewares/protectMiddleware.js';
import checkRoleMiddleware from '../middlewares/roleMiddleware.js';
import roleMiddleware from '../middlewares/roleMiddleware.js';

router.use(protectMiddleware.protect);
router.use(roleMiddleware.isAdmin);

export default router;
