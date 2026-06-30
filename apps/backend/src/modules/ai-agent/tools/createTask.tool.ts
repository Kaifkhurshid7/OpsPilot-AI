import prisma from '../../../config/db';
import { ToolContext } from './tool.registry';

export async function createTask(
  args: Record<string, any>,
  context: ToolContext,
): Promise<Record<string, any>> {
  const { contactId, title, dueInHours = 24 } = args;

  // Verify contact if provided
  if (contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId: context.tenantId },
    });
    if (!contact) {
      return { success: false, error: 'Contact not found' };
    }
  }

  const dueAt = new Date(Date.now() + dueInHours * 60 * 60 * 1000);

  const task = await prisma.task.create({
    data: {
      tenantId: context.tenantId,
      contactId: contactId || null,
      title,
      dueAt,
      createdBy: 'AI_AGENT',
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      tenantId: context.tenantId,
      actor: 'AI_AGENT',
      action: 'TOOL_CALL_CREATE_TASK',
      targetType: 'Task',
      targetId: task.id,
      metadata: { title, dueAt: dueAt.toISOString(), contactId },
    },
  });

  return {
    success: true,
    task: { id: task.id, title: task.title, dueAt: task.dueAt, status: task.status },
  };
}
