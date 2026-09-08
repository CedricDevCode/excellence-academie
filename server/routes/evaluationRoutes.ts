import { Router } from 'express';
import { getEvaluations, createEvaluation, updateEvaluation } from '../controllers/evaluationController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/', requireRole(['ADMIN', 'SECRETARY', 'TEACHER']), getEvaluations);
router.post('/', requireRole(['TEACHER']), createEvaluation);
router.put('/:id', requireRole(['TEACHER', 'ADMIN']), updateEvaluation);

export default router;
