import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  handleVerifyCard,
  handleGetMyCard,
  handleGetStudentCardAdmin,
  handleListAllCards,
  handleRevokeCard,
  handleReissueCard,
  handleBulkGenerate
} from '../controllers/cardController.js';
import { requireAuth, requireStudent } from '../middleware/auth.js';

const router = express.Router();

const verifyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 verification requests per minute per IP
  message: {
    success: false,
    message: 'Too many card verification checks. Please wait a moment.'
  }
});

// Public verification check (scanned by QR code or entered manually)
router.get('/verify/:token', verifyLimiter, handleVerifyCard);

// Student portal - get own card
router.get('/my-card', requireStudent, handleGetMyCard);

// Admin routes
router.get('/list', requireAuth, handleListAllCards);
router.get('/student/:studentId', requireAuth, handleGetStudentCardAdmin);
router.post('/revoke/:studentId', requireAuth, handleRevokeCard);
router.post('/reissue/:studentId', requireAuth, handleReissueCard);
router.post('/bulk-generate', requireAuth, handleBulkGenerate);

export default router;
