import express from 'express';
import { 
  getStudents, 
  getStudentProfile, 
  createStudent, 
  updateStudent, 
  archiveStudent 
} from '../controllers/studentController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAdmin); // Protected admin routes

router.get('/', getStudents);
router.get('/:id', getStudentProfile);
router.post('/', createStudent);
router.put('/:id', updateStudent);
router.delete('/:id', archiveStudent);

export default router;
