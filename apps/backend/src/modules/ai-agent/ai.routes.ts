import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantScope } from '../../middleware/tenantScope.middleware';
import { AIController } from './ai.controller';

const router = Router();

router.use(authMiddleware, tenantScope);

router.post('/chat', AIController.chat);
router.get('/conversations', AIController.listConversations);
router.get('/conversations/:id/messages', AIController.getMessages);

export default router;
