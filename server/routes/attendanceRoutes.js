import express from 'express';
import { saveAttendance, getSessionAttendance } from '../controllers/attendanceController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAdmin);

router.post('/', saveAttendance);
router.post('/save', saveAttendance);
router.get('/session/:id', getSessionAttendance);

export default router;
