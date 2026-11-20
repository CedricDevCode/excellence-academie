import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';
import {
  chatUpload, listContactableUsers, listConversations, createConversation, listMessages,
  postMessage, uploadChatAttachment, downloadAttachment, editMessage, deleteMessage, deleteConversation,
} from '../controllers/conversationController';
import { libraryUpload, listLibraryDocuments, uploadLibraryDocument, downloadLibraryDocument, deleteLibraryDocument } from '../controllers/libraryController';

const router = Router();
router.use(authenticateToken);

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de messages. Réessayez dans une minute.' },
});

// Messagerie
router.get('/conversations/users', listContactableUsers);
router.get('/conversations', listConversations);
router.post('/conversations', createConversation);
router.delete('/conversations/:id', deleteConversation);
router.get('/conversations/:id/messages', listMessages);
router.post('/conversations/:id/messages', chatLimiter, postMessage);
router.patch('/conversations/:conversationId/messages/:messageId', chatLimiter, editMessage);
router.delete('/conversations/:conversationId/messages/:messageId', chatLimiter, deleteMessage);
router.post('/conversations/:id/attachments', chatLimiter, chatUpload.single('file'), uploadChatAttachment);
router.get('/conversations/attachments/:id/download', downloadAttachment);

// Bibliothèque
router.get('/library', requireRole(['ADMIN', 'TEACHER', 'SECRETARY', 'ACCOUNTANT', 'STUDENT']), listLibraryDocuments);
router.post('/library', requireRole(['ADMIN', 'TEACHER', 'SECRETARY', 'ACCOUNTANT']), libraryUpload.single('file'), uploadLibraryDocument);
router.get('/library/:id/download', requireRole(['ADMIN', 'TEACHER', 'SECRETARY', 'ACCOUNTANT', 'STUDENT']), downloadLibraryDocument);
router.delete('/library/:id', requireRole(['ADMIN', 'TEACHER', 'SECRETARY', 'ACCOUNTANT']), deleteLibraryDocument);

export default router;
