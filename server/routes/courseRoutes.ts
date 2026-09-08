import { Router } from 'express';
import { getAllCourses, createCourse, updateCourse, deleteCourse } from '../controllers/courseController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Public route to get courses (needed for the registration form)
router.get('/', getAllCourses);

// Protected routes (Admin only)
router.use(authenticateToken);
router.post('/', requireRole(['ADMIN']), createCourse);
router.put('/:id', requireRole(['ADMIN']), updateCourse);
router.delete('/:id', requireRole(['ADMIN']), deleteCourse);

export default router;
