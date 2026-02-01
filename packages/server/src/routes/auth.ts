import { Router, type IRouter } from 'express';
import { authController } from '../controllers/index.js';
import { authenticate, validate, registerSchema, loginSchema } from '../middleware/index.js';

const router: IRouter = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authenticate, authController.me);

export default router;
