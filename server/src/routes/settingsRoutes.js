import { Router } from 'express';
import { changePassword, listUsers, removeProfilePicture, updateProfile, updateRole } from '../controllers/settingsController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.put('/profile', updateProfile);
router.put('/password', changePassword);
router.delete('/profile-picture', removeProfilePicture);
router.get('/users', authorize('admin'), listUsers);
router.put('/users/:id/role', authorize('admin'), updateRole);
export default router;
