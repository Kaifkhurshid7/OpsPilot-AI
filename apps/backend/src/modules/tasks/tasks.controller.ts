import { Request, Response } from 'express';
import prisma from '../../config/db';

export class TasksController {
  static async list(req: Request, res: Response): Promise<void> {
    const { tenantId } = req.context!;
    const { status, page = '1', pageSize = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where: any = { tenantId };
    if (status) where.status = status;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take,
        include: { contact: { select: { id: true, name: true } } },
        orderBy: { dueAt: 'asc' },
      }),
      prisma.task.count({ where }),
    ]);

    res.json({
      success: true,
      data: tasks,
      total,
      page: parseInt(page as string),
      pageSize: take,
    });
  }

  static async create(req: Request, res: Response): Promise<void> {
    const { tenantId, userId } = req.context!;
    const { contactId, title, dueAt } = req.body;

    if (contactId) {
      const contact = await prisma.contact.findFirst({ where: { id: contactId, tenantId } });
      if (!contact) {
        res.status(404).json({ success: false, error: 'Contact not found' });
        return;
      }
    }

    const task = await prisma.task.create({
      data: {
        tenantId,
        contactId: contactId || null,
        title,
        dueAt: new Date(dueAt),
        createdBy: userId,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actor: userId,
        action: 'TASK_CREATED',
        targetType: 'Task',
        targetId: task.id,
        metadata: { title },
      },
    });

    res.status(201).json({ success: true, data: task });
  }

  static async update(req: Request, res: Response): Promise<void> {
    const { tenantId } = req.context!;
    const { id } = req.params;

    const existing = await prisma.task.findFirst({ where: { id, tenantId } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const updateData: any = { ...req.body };
    if (updateData.dueAt) updateData.dueAt = new Date(updateData.dueAt);

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: task });
  }
}
