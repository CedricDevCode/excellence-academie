import { Router } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/authMiddleware';
import {
  createSession, getSessions, updateSession, deleteSession,
  getMonthlySalaryReport, payTeacherSalary, getStudentSessions,
  completeSession, validateSession, uploadSessionFile, getSessionFiles, downloadSessionFile,
} from '../controllers/sessionController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticateToken);

// Static routes MUST come before parameterized routes
router.get('/salary-report', requireRole(['ADMIN', 'ACCOUNTANT', 'SECRETARY']), getMonthlySalaryReport);
router.post('/pay-salary', requireRole(['ADMIN', 'ACCOUNTANT']), payTeacherSalary);
router.get('/my-sessions', requireRole(['STUDENT']), getStudentSessions);

router.post('/', requireRole(['ADMIN', 'ACCOUNTANT', 'SECRETARY']), createSession);
router.get('/', requireRole(['ADMIN', 'ACCOUNTANT', 'SECRETARY', 'TEACHER', 'STUDENT']), getSessions);
router.put('/:id', requireRole(['ADMIN', 'ACCOUNTANT', 'SECRETARY']), updateSession);
router.delete('/:id', requireRole(['ADMIN', 'ACCOUNTANT']), deleteSession);

// Static routes MUST come before parameterized ones
router.get('/files/:fileId/download', requireRole(['STUDENT', 'TEACHER', 'ADMIN', 'SECRETARY']), downloadSessionFile);

// Parameterized routes
router.put('/:id/complete', requireRole(['TEACHER']), completeSession);
router.put('/:id/validate', requireRole(['ADMIN', 'SECRETARY']), validateSession);
router.post('/:id/files', requireRole(['TEACHER']), upload.single('file'), uploadSessionFile);
router.get('/:id/files', requireRole(['STUDENT', 'TEACHER', 'ADMIN', 'SECRETARY']), getSessionFiles);

export default router;
