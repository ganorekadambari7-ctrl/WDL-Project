import { Router } from 'express';
import { applyLeave, getLeaves, reviewLeave } from '../controllers/leaveController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.route('/').get(getLeaves).post(applyLeave);
router.put('/:id', authorize('admin'), reviewLeave);
export default router;
