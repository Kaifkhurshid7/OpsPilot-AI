import prisma from '../../../config/db';
import { ToolContext } from './tool.registry';
import { WhatsAppMessage } from '../../whatsapp/whatsapp.model';

export async function sendWhatsapp(
  args: Record<string, any>,
  context: ToolContext,
): Promise<Record<string, any>> {
  const { contactId, message } = args;

  // Verify contact
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, tenantId: context.tenantId },
  });

  if (!contact) {
    return { success: false, error: 'Contact not found' };
  }

  if (!contact.phone) {
    return { success: false, error: 'Contact has no phone number' };
  }

  // Store the outbound message in MongoDB
  const whatsappMessage = await WhatsAppMessage.create({
    tenantId: context.tenantId,
    contactId: contact.id,
    direction: 'outbound',
    waMessageId: `sim_${Date.now()}`,
    body: message,
    rawPayload: { simulated: true, to: contact.phone },
    createdAt: new Date(),
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      tenantId: context.tenantId,
      actor: 'AI_AGENT',
      action: 'TOOL_CALL_SEND_WHATSAPP',
      targetType: 'Contact',
      targetId: contactId,
      metadata: { phone: contact.phone, messagePreview: message.substring(0, 100) },
    },
  });

  return {
    success: true,
    messageSent: {
      to: contact.name,
      phone: contact.phone,
      preview: message.substring(0, 80),
      messageId: whatsappMessage._id.toString(),
    },
  };
}
