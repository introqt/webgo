import { Router, type IRouter } from 'express';
import { gameController } from '../controllers/index.js';
import { authenticate, validate, createGameSchema, createBotGameSchema } from '../middleware/index.js';

const router: IRouter = Router();

router.post('/', authenticate, validate(createGameSchema), gameController.createGame);
router.post('/create-vs-bot', authenticate, validate(createBotGameSchema), gameController.createVsBot);
router.get('/my-games', authenticate, gameController.myGames);
router.get('/join/:invitationCode', gameController.getGameByCode);
router.post('/join/:invitationCode', authenticate, gameController.joinGame);
router.get('/:gameId', gameController.getGame);
router.post('/:gameId/resign', authenticate, gameController.resign);
router.get('/:gameId/analysis/:playerId', authenticate, gameController.getAnalysis);

export default router;
