import { Router } from 'express';
import { getSalaryInsights } from '../controllers/insightsController.js';
import { authorize, protect } from '../middleware/auth.js';
const router = Router();
router.use(protect);
router.get('/', authorize('admin'), getSalaryInsights);
export default router;
