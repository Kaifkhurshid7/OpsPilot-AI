import prisma from '../../../config/db';
import { ToolContext } from './tool.registry';

export async function fetchMetrics(
  _args: Record<string, any>,
  context: ToolContext,
): Promise<Record<string, any>> {
  const { tenantId } = context;

  const [
    activeOpportunities,
    pipelineResult,
    pendingTasks,
    recentContacts,
    wonDeals,
  ] = await Promise.all([
    prisma.opportunity.count({
      where: { tenantId, stage: { notIn: ['won', 'lost'] } },
    }),
    prisma.opportunity.aggregate({
      where: { tenantId, stage: { notIn: ['won', 'lost'] } },
      _sum: { value: true },
    }),
    prisma.task.count({
      where: { tenantId, status: 'pending' },
    }),
    prisma.contact.count({
      where: { tenantId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.opportunity.count({
      where: { tenantId, stage: 'won' },
    }),
  ]);

  return {
    activeOpportunities,
    pipelineValue: pipelineResult._sum.value || 0,
    pendingFollowUps: pendingTasks,
    newContactsThisWeek: recentContacts,
    wonDeals,
  };
}
