import prisma from '../../../config/db';
import { ToolContext } from './tool.registry';

export async function searchContacts(
  args: Record<string, any>,
  context: ToolContext,
): Promise<Record<string, any>> {
  const { query } = args;

  const contacts = await prisma.contact.findMany({
    where: {
      tenantId: context.tenantId,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query } },
      ],
    },
    take: 10,
    include: {
      opportunities: { select: { id: true, title: true, stage: true, value: true } },
      tasks: { where: { status: 'pending' }, select: { id: true, title: true, dueAt: true } },
    },
  });

  return {
    found: contacts.length,
    contacts: contacts.map((c: any) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      source: c.source,
      tags: c.tags,
      opportunities: c.opportunities,
      pendingTasks: c.tasks,
    })),
  };
}
