import express from 'express';
import { askBhagavadGita, getAttendanceInsights } from '../controllers/aiController.js';
import { requireAdmin } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting on AI endpoints (30 requests per 10 minutes)
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'AI request limit reached. Please wait a few moments before submitting another inquiry.'
  }
});

// Feature 1: Bhagavad Gita Assistant Q&A
router.post('/gita-ask', aiLimiter, askBhagavadGita);

// Feature 2: Attendance Insights (Strict Admin Authorization)
router.post('/attendance-insights', aiLimiter, requireAdmin, getAttendanceInsights);

export default router;
