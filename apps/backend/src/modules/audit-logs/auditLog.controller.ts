import { Request, Response } from 'express';
import prisma from '../../config/db';

export class AuditLogController {
  static async list(req: Request, res: Response): Promise<void> {
    const { tenantId } = req.context!;
    const { page = '1', pageSize = '50', action, actor } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where: any = { tenantId };
    if (action) where.action = { contains: action as string };
    if (actor) where.actor = actor;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      total,
      page: parseInt(page as string),
      pageSize: take,
    });
  }
}
