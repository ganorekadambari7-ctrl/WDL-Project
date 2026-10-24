import { Router } from 'express';
import { getAllAttendance, getEmployeeAttendance, markAttendance } from '../controllers/attendanceController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.post('/', authorize('admin'), markAttendance);
router.get('/', authorize('admin'), getAllAttendance);
router.get('/:employeeId', getEmployeeAttendance);
export default router;
