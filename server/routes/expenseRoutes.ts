import { Router } from 'express';
import { createExpense, getExpenses, updateExpense, deleteExpense, getExpenseSummary } from '../controllers/expenseController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';
import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';

const router = Router();

router.use(authenticateToken);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), 'uploads')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `expense-${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Type de fichier non supporté'));
  },
});

router.post('/upload', requireRole(['ADMIN', 'ACCOUNTANT']), upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier fourni' });
  }
  const url = `/uploads/${req.file.filename}`;
  res.status(201).json({ url, filename: req.file.originalname });
});

router.post('/', requireRole(['ADMIN', 'ACCOUNTANT']), createExpense);
router.get('/', requireRole(['ADMIN', 'ACCOUNTANT']), getExpenses);
router.get('/summary', requireRole(['ADMIN', 'ACCOUNTANT']), getExpenseSummary);
router.put('/:id', requireRole(['ADMIN', 'ACCOUNTANT']), updateExpense);
router.delete('/:id', requireRole(['ADMIN', 'ACCOUNTANT']), deleteExpense);

export default router;
