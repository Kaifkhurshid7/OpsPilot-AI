import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantScope } from '../../middleware/tenantScope.middleware';
import { WorkflowController } from './workflow.controller';

const router = Router();

router.use(authMiddleware, tenantScope);

router.post('/lead-qualification/run', WorkflowController.runLeadQualification);

export default router;
