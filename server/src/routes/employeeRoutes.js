import { Router } from 'express';
import {
  createEmployee, deleteEmployee, getEmployees,
  updateEmployee, getMyEmployee,
} from '../controllers/employeeController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

// Employee-only: view their own linked Employee record
router.get('/me', getMyEmployee);

// Admin-only write operations
router.route('/')
  .get(getEmployees)
  .post(authorize('admin'), createEmployee);

router.route('/:id')
  .put(authorize('admin'), updateEmployee)
  .delete(authorize('admin'), deleteEmployee);

export default router;
