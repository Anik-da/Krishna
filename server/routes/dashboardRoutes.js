import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAdmin);

router.get('/stats', getDashboardStats);

export default router;
