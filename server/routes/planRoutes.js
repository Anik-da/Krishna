import express from 'express';
import { 
  getCurrentPlan, 
  getAllPlans, 
  saveWeeklyPlan, 
  reschedulePlan, 
  cancelWeeklyPlan 
} from '../controllers/planController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes for landing page & students
router.get('/current', getCurrentPlan);
router.get('/', getAllPlans);
router.get('/all', getAllPlans);

// Admin-only planning routes
router.post('/', requireAdmin, saveWeeklyPlan);
router.put('/:weekKey/reschedule', requireAdmin, reschedulePlan);
router.put('/:weekKey/cancel', requireAdmin, cancelWeeklyPlan);

export default router;
