import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { z } from 'zod';
import { OnboardingController } from './onboarding.controller';

const router = Router();

const onboardingSchema = z.object({
  businessName: z.string().min(1).max(100),
  industry: z.string().optional(),
});

router.post(
  '/business',
  authMiddleware,
  validate(onboardingSchema),
  OnboardingController.createBusiness,
);

export default router;
