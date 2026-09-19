import { Router } from 'express';
import { getEvaluations, createEvaluation, updateEvaluation, deleteEvaluation } from '../controllers/evaluationController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';
import { validateBody, createEvaluationSchema, updateEvaluationSchema } from '../middleware/validate';

const router = Router();

router.use(authenticateToken);

router.get('/', requireRole(['ADMIN', 'SECRETARY', 'TEACHER']), getEvaluations);
router.post('/', requireRole(['TEACHER']), validateBody(createEvaluationSchema), createEvaluation);
router.put('/:id', requireRole(['TEACHER', 'ADMIN']), validateBody(updateEvaluationSchema), updateEvaluation);
router.delete('/:id', requireRole(['TEACHER', 'ADMIN']), deleteEvaluation);

export default router;
