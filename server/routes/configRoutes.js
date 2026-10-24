import express from 'express';
import { 
  getPublishedConfig, 
  getDraftConfig, 
  saveDraftConfig, 
  publishConfig, 
  resetConfig,
  uploadLogo,
  removeLogo
} from '../controllers/configController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public route for landing page
router.get('/published', getPublishedConfig);

// Admin-only customization routes
router.get('/draft', requireAdmin, getDraftConfig);
router.put('/draft', requireAdmin, saveDraftConfig);
router.post('/publish', requireAdmin, publishConfig);
router.post('/reset', requireAdmin, resetConfig);
router.post('/upload-logo', requireAdmin, uploadLogo);
router.post('/remove-logo', requireAdmin, removeLogo);

export default router;
