import express from 'express';
import { 
  getSessions, 
  createSession, 
  cancelSession, 
  restoreSession,
  updateSessionConductor,
  deleteSession
} from '../controllers/sessionController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public or authenticated reading of class sessions
router.get('/', getSessions);

// Admin-only session mutations
router.post('/', requireAdmin, createSession);
router.delete('/:id', requireAdmin, deleteSession);
router.patch('/:id/cancel', requireAdmin, cancelSession);
router.patch('/:id/restore', requireAdmin, restoreSession);
router.patch('/:id/conductor', requireAdmin, updateSessionConductor);

export default router;
