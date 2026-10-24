import express from 'express';
import { getReportData } from '../controllers/reportController.js';
import { getAdminAiUsageReport } from '../controllers/studentPortalController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAdmin);

router.get('/', getReportData);
router.get('/ai-usage', getAdminAiUsageReport);

export default router;
