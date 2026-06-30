import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { tenantScope } from '../../middleware/tenantScope.middleware';
import { AuditLogController } from './auditLog.controller';

const router = Router();

router.use(authMiddleware, tenantScope, requireRole('OWNER', 'ADMIN'));

router.get('/', AuditLogController.list);

export default router;
