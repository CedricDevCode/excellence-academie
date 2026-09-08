import { Router } from 'express';
import { getCities, createCity, updateCity, deleteCity } from '../controllers/cityController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/', requireRole(['ADMIN', 'ACCOUNTANT']), getCities);
router.post('/', requireRole(['ADMIN']), createCity);
router.put('/:id', requireRole(['ADMIN']), updateCity);
router.delete('/:id', requireRole(['ADMIN']), deleteCity);

export default router;
