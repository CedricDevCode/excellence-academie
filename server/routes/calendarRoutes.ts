import { Router } from 'express';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../controllers/calendarController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getEvents);
router.post('/', requireRole(['ADMIN', 'SECRETARY', 'TEACHER']), createEvent);
router.put('/:id', requireRole(['ADMIN', 'SECRETARY', 'TEACHER']), updateEvent);
router.delete('/:id', requireRole(['ADMIN', 'SECRETARY']), deleteEvent);

export default router;
