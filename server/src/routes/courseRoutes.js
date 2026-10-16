import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  verifyCertificate,
  deleteCourse,
} from '../controllers/courseController.js';

const router = express.Router();

router.use(protect);

router.get('/', getCourses);
router.post('/', createCourse);
router.get('/:id', getCourseById);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);

// Admin only verification endpoint
router.put('/:id/verify', authorize('admin'), verifyCertificate);

export default router;
