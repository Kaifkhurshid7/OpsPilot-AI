import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantScope } from '../../middleware/tenantScope.middleware';
import { InboxController } from './inbox.controller';

const router = Router();

router.use(authMiddleware, tenantScope);

router.get('/:contactId/timeline', InboxController.getTimeline);

export default router;
