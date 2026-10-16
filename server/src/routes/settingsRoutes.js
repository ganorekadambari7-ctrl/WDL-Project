import { Router } from 'express';
import { changePassword, listUsers, removeProfilePicture, updateProfile, updateRole, linkEmployeeToUser } from '../controllers/settingsController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.put('/profile', updateProfile);
router.put('/password', changePassword);
router.delete('/profile-picture', removeProfilePicture);
router.get('/users', authorize('admin'), listUsers);
router.put('/users/:id/role', authorize('admin'), updateRole);
// Admin-only: link a User account to an Employee record
router.put('/users/:id/link-employee', authorize('admin'), linkEmployeeToUser);
export default router;
