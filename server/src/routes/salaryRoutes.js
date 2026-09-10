import { Router } from 'express';
import { calculateSalary, getSalaries } from '../controllers/salaryController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.post('/calculate', calculateSalary);
router.get('/:employeeId', getSalaries);
export default router;
