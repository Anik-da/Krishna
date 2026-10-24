import express from 'express';
import { 
  studentLogin, 
  registerStudent,
  getStudentProfile, 
  getStudentAttendance, 
  getStudentAiQuota, 
  askStudentGita, 
  askStudentAttendanceAi 
} from '../controllers/studentPortalController.js';
import { requireStudent } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const studentLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many sign in attempts. Please try again after 15 minutes.'
  }
});

// Public Student Login & Registration
router.post('/login', studentLoginLimiter, studentLogin);
router.post('/register', studentLoginLimiter, registerStudent);

// Protected Student Portal Routes
router.get('/me', requireStudent, getStudentProfile);
router.get('/attendance', requireStudent, getStudentAttendance);
router.get('/ai-quota', requireStudent, getStudentAiQuota);
router.post('/ai/gita', requireStudent, askStudentGita);
router.post('/ai/attendance', requireStudent, askStudentAttendanceAi);

export default router;
