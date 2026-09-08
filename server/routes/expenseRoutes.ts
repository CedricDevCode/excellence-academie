import { Router } from 'express';
import { createExpense, getExpenses, updateExpense, deleteExpense, getExpenseSummary } from '../controllers/expenseController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.post('/', requireRole(['ADMIN', 'ACCOUNTANT']), createExpense);
router.get('/', requireRole(['ADMIN', 'ACCOUNTANT']), getExpenses);
router.get('/summary', requireRole(['ADMIN', 'ACCOUNTANT']), getExpenseSummary);
router.put('/:id', requireRole(['ADMIN', 'ACCOUNTANT']), updateExpense);
router.delete('/:id', requireRole(['ADMIN', 'ACCOUNTANT']), deleteExpense);

export default router;
