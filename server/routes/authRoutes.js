import express from 'express';
import { 
  login, 
  logout, 
  getMe, 
  listAdmins, 
  createAdmin, 
  updateAdminPassword, 
  updateAdminRole, 
  deleteAdmin 
} from '../controllers/authController.js';
import { requireAdmin } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAdmin, getMe);

// Admin & Super Admin Management Routes
router.get('/admins', requireAdmin, listAdmins);
router.post('/admins', requireAdmin, createAdmin);
router.put('/admins/:username/password', requireAdmin, updateAdminPassword);
router.put('/admins/:username/role', requireAdmin, updateAdminRole);
router.delete('/admins/:username', requireAdmin, deleteAdmin);

export default router;
