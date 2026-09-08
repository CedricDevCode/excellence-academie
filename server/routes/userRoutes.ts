import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getUsers, createUser, updateUser, deleteUser, updateMyProfile } from '../controllers/userController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const userUploadsDir = path.join(__dirname, '..', 'uploads', 'users');
fs.mkdirSync(userUploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, userUploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

router.use(authenticateToken);

router.put('/me', updateMyProfile);
router.get('/', requireRole(['ADMIN']), getUsers);
router.post('/', requireRole(['ADMIN']), createUser);
router.put('/:id', requireRole(['ADMIN']), updateUser);
router.delete('/:id', requireRole(['ADMIN']), deleteUser);

export default router;
