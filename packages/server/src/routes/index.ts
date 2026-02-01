import { Router, type IRouter } from 'express';
import authRoutes from './auth.js';
import gameRoutes from './games.js';
import userRoutes from './users.js';

const router: IRouter = Router();

router.use('/auth', authRoutes);
router.use('/games', gameRoutes);
router.use('/users', userRoutes);

// Health check
router.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
