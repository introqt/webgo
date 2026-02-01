import { Router, type IRouter } from 'express';
import { gameController } from '../controllers/index.js';
import { authenticate, validate, createGameSchema } from '../middleware/index.js';

const router: IRouter = Router();

router.post('/', authenticate, validate(createGameSchema), gameController.createGame);
router.get('/my-games', authenticate, gameController.myGames);
router.get('/join/:invitationCode', gameController.getGameByCode);
router.post('/join/:invitationCode', authenticate, gameController.joinGame);
router.get('/:gameId', gameController.getGame);
router.post('/:gameId/resign', authenticate, gameController.resign);

export default router;
