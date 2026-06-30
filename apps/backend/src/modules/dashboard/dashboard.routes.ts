import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantScope } from '../../middleware/tenantScope.middleware';
import { DashboardController } from './dashboard.controller';

const router = Router();

router.use(authMiddleware, tenantScope);

router.get('/kpis', DashboardController.getKpis);

export default router;
