import express from 'express';
import { 
  getActiveSeasonData, 
  getPublicLeaderboard, 
  getAllSeasons, 
  updateSeasonConfig, 
  confirmSeasonDate,
  addPointAdjustment, 
  getAdjustmentsHistory, 
  updatePrizeStatus, 
  finalizeSeason 
} from '../controllers/janmashtamiController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes (No login required)
router.get('/public-leaderboard', getPublicLeaderboard);

// Authenticated or portal route
router.get('/active', getActiveSeasonData);

// Admin-only routes
router.get('/seasons', requireAdmin, getAllSeasons);
router.post('/season', requireAdmin, updateSeasonConfig);
router.post('/confirm-date', requireAdmin, confirmSeasonDate);
router.post('/adjustment', requireAdmin, addPointAdjustment);
router.get('/adjustments', requireAdmin, getAdjustmentsHistory);
router.post('/prizes', requireAdmin, updatePrizeStatus);
router.post('/finalize', requireAdmin, finalizeSeason);

export default router;
