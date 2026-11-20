import { Router } from 'express';
import {
  signContract,
  getMyContract,
  getAllContracts,
  getContractByUserId,
  getSignedPdf,
  contractUpload,
  getContractDocument,
  getContractDocumentFile,
  uploadContractDocument,
} from '../controllers/contractController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/document', authenticateToken, getContractDocument);
router.get('/document/file', authenticateToken, getContractDocumentFile);
router.post('/document', authenticateToken, requireRole(['ADMIN']), contractUpload.single('file'), uploadContractDocument);
router.post('/sign', authenticateToken, signContract);
router.get('/my-contract', authenticateToken, getMyContract);
router.get('/', authenticateToken, requireRole(['ADMIN', 'ACCOUNTANT', 'SECRETARY']), getAllContracts);
router.get('/:id/signed-pdf', authenticateToken, getSignedPdf);
router.get('/:userId', authenticateToken, requireRole(['ADMIN', 'ACCOUNTANT', 'SECRETARY']), getContractByUserId);

export default router;
