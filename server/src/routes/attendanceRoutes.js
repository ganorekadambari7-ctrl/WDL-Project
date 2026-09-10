import { Router } from 'express';
import { getEmployeeAttendance, markAttendance } from '../controllers/attendanceController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.post('/', markAttendance);
router.get('/:employeeId', getEmployeeAttendance);
export default router;
