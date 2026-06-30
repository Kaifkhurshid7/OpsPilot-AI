import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// Google OAuth
router.get('/google', AuthController.googleRedirect);
router.get('/google/callback', AuthController.googleCallback);

// Token management
router.post('/refresh', AuthController.refresh);
router.post('/logout', authMiddleware, AuthController.logout);

// Current user
router.get('/me', authMiddleware, AuthController.me);

export default router;
