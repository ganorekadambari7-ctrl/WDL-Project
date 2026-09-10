import { Router } from 'express';
import { getSalaryInsights } from '../controllers/insightsController.js';
import { protect } from '../middleware/auth.js';
const router = Router();
router.use(protect);
router.get('/', getSalaryInsights);
export default router;
