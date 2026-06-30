import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantScope } from '../../middleware/tenantScope.middleware';
import { validate } from '../../middleware/validate.middleware';
import { TasksController } from './tasks.controller';
import { z } from 'zod';

const router = Router();

const createTaskSchema = z.object({
  contactId: z.string().uuid().optional(),
  title: z.string().min(1).max(300),
  dueAt: z.string().datetime(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  dueAt: z.string().datetime().optional(),
  status: z.enum(['pending', 'done']).optional(),
});

router.use(authMiddleware, tenantScope);

router.get('/', TasksController.list);
router.post('/', validate(createTaskSchema), TasksController.create);
router.patch('/:id', validate(updateTaskSchema), TasksController.update);

export default router;
