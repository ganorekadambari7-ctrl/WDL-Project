import { Router } from 'express';
import {
  getDesignations,
  createDesignation,
  updateDesignation,
  createPromotion,
  getPromotions,
  getEmployeePromotionHistory,
  getApplicableSalary,
  getEligiblePromotions,
} from '../controllers/promotionController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

// Designations
router.get('/designations', getDesignations);
router.post('/designations', authorize('admin'), createDesignation);
router.put('/designations/:id', authorize('admin'), updateDesignation);

// Promotions
router.get('/', getPromotions);
router.post('/', authorize('admin'), createPromotion);
router.get('/eligible/:employeeId', authorize('admin'), getEligiblePromotions);
router.get('/history/:employeeId', getEmployeePromotionHistory);
router.get('/applicable-rate/:employeeId', getApplicableSalary);

export default router;
