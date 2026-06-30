import prisma from '../../../config/db';
import { ToolContext } from './tool.registry';

export async function updateOpportunity(
  args: Record<string, any>,
  context: ToolContext,
): Promise<Record<string, any>> {
  const { opportunityId, stage, value } = args;

  const existing = await prisma.opportunity.findFirst({
    where: { id: opportunityId, tenantId: context.tenantId },
  });

  if (!existing) {
    return { success: false, error: 'Opportunity not found' };
  }

  const updateData: any = {};
  if (stage) updateData.stage = stage;
  if (value !== undefined) updateData.value = value;

  const opportunity = await prisma.opportunity.update({
    where: { id: opportunityId },
    data: updateData,
    include: { contact: { select: { name: true } } },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      tenantId: context.tenantId,
      actor: 'AI_AGENT',
      action: 'TOOL_CALL_UPDATE_OPPORTUNITY',
      targetType: 'Opportunity',
      targetId: opportunityId,
      metadata: { previousStage: existing.stage, newStage: stage, value },
    },
  });

  return {
    success: true,
    opportunity: {
      id: opportunity.id,
      title: opportunity.title,
      stage: opportunity.stage,
      value: opportunity.value,
      contactName: opportunity.contact.name,
    },
  };
}
