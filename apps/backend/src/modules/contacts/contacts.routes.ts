import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantScope } from '../../middleware/tenantScope.middleware';
import { validate } from '../../middleware/validate.middleware';
import { ContactsController } from './contacts.controller';
import { z } from 'zod';

const router = Router();

const createContactSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateContactSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

router.use(authMiddleware, tenantScope);

router.get('/', ContactsController.list);
router.post('/', validate(createContactSchema), ContactsController.create);
router.get('/:id', ContactsController.getById);
router.patch('/:id', validate(updateContactSchema), ContactsController.update);
router.delete('/:id', ContactsController.delete);

export default router;
