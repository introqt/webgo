import { Router, type IRouter } from 'express';
import { userController } from '../controllers/index.js';
import { authenticate } from '../middleware/index.js';

const router: IRouter = Router();

router.get('/leaderboard', userController.getLeaderboard);
router.get('/me/game-history', authenticate, userController.getMyGameHistory);
router.get('/:userId/game-history', userController.getGameHistory);

export default router;
