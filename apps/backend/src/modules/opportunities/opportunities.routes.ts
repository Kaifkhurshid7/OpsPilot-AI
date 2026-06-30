import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantScope } from '../../middleware/tenantScope.middleware';
import { validate } from '../../middleware/validate.middleware';
import { OpportunitiesController } from './opportunities.controller';
import { z } from 'zod';

const router = Router();

const createOpportunitySchema = z.object({
  contactId: z.string().uuid(),
  title: z.string().min(1).max(200),
  value: z.number().min(0).optional(),
  stage: z.enum(['new', 'qualifying', 'nurture', 'won', 'lost']).optional(),
});

const updateOpportunitySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  value: z.number().min(0).optional(),
  stage: z.enum(['new', 'qualifying', 'nurture', 'won', 'lost']).optional(),
  score: z.number().min(0).max(100).optional(),
  nextBestAction: z.string().optional(),
});

router.use(authMiddleware, tenantScope);

router.get('/', OpportunitiesController.list);
router.post('/', validate(createOpportunitySchema), OpportunitiesController.create);
router.get('/:id', OpportunitiesController.getById);
router.patch('/:id', validate(updateOpportunitySchema), OpportunitiesController.update);

export default router;
