import express from 'express';
import { dashboardController } from './dashboardController.js';
import { authenticateToken, authorize } from '../../middleware/auth.js';

const router = express.Router();

// Get aggregated dashboard metrics
router.get('/overview', authenticateToken, authorize('HRMANAGER'), dashboardController.getOverview);

export const dashboardRouter = router;
