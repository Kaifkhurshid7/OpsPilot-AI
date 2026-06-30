import { Router } from 'express';
import { WhatsAppController } from './whatsapp.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantScope } from '../../middleware/tenantScope.middleware';

const router = Router();

// Webhook endpoints (no auth — Meta calls these)
router.get('/', WhatsAppController.verifyWebhook);
router.post('/', WhatsAppController.receiveWebhook);

// Sending (authenticated)
router.post('/send', authMiddleware, tenantScope, WhatsAppController.send);

export default router;
