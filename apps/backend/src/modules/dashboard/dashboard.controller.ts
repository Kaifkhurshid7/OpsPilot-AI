import { Request, Response } from 'express';
import prisma from '../../config/db';
import redis from '../../config/redis';

export class DashboardController {
  static async getKpis(req: Request, res: Response): Promise<void> {
    const { tenantId } = req.context!;
    const cacheKey = `dashboard:kpis:${tenantId}`;

    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.json({ success: true, data: JSON.parse(cached), cached: true });
      return;
    }

    // Compute KPIs
    const [
      activeOpportunities,
      pipelineResult,
      pendingTasks,
      totalContacts,
      recentActivity,
      wonDeals,
    ] = await Promise.all([
      prisma.opportunity.count({
        where: { tenantId, stage: { notIn: ['won', 'lost'] } },
      }),
      prisma.opportunity.aggregate({
        where: { tenantId, stage: { notIn: ['won', 'lost'] } },
        _sum: { value: true },
      }),
      prisma.task.count({ where: { tenantId, status: 'pending' } }),
      prisma.contact.count({ where: { tenantId } }),
      prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.opportunity.count({ where: { tenantId, stage: 'won' } }),
    ]);

    const kpis = {
      activeOpportunities,
      pipelineValue: Number(pipelineResult._sum.value || 0),
      pendingFollowUps: pendingTasks,
      totalContacts,
      wonDeals,
      recentActivity,
    };

    // Cache for 60 seconds
    await redis.setex(cacheKey, 60, JSON.stringify(kpis));

    res.json({ success: true, data: kpis, cached: false });
  }
}
