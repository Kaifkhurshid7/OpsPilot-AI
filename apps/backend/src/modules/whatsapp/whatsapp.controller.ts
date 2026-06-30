import { Request, Response } from 'express';
import { env } from '../../config/env';
import { WhatsAppMessage } from './whatsapp.model';
import prisma from '../../config/db';
import { Queue } from 'bullmq';
import redis from '../../config/redis';

const summarizeQueue = new Queue('whatsapp-summarize', { connection: redis as any });

export class WhatsAppController {
  /**
   * GET /webhooks/whatsapp - Meta verification handshake
   */
  static verifyWebhook(req: Request, res: Response): void {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }

  /**
   * POST /webhooks/whatsapp - Receive inbound message
   */
  static async receiveWebhook(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body;

      // Acknowledge immediately
      res.sendStatus(200);

      // Extract message from Meta's webhook payload
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messageData = value?.messages?.[0];

      if (!messageData) return;

      const from = messageData.from; // phone number
      const text = messageData.text?.body || '';
      const waMessageId = messageData.id;

      // Find contact by phone number (across all tenants for webhook)
      const contact = await prisma.contact.findFirst({
        where: { phone: { contains: from } },
      });

      if (!contact) {
        console.log(`WhatsApp from unknown number: ${from}`);
        return;
      }

      // Store message
      const message = await WhatsAppMessage.create({
        tenantId: contact.tenantId,
        contactId: contact.id,
        direction: 'inbound',
        waMessageId,
        body: text,
        rawPayload: body,
      });

      // Enqueue AI summarization job
      await summarizeQueue.add('summarize', {
        messageId: message._id.toString(),
        tenantId: contact.tenantId,
        contactId: contact.id,
        text,
      });
    } catch (error) {
      console.error('WhatsApp webhook error:', error);
    }
  }

  /**
   * POST /whatsapp/send - Send outbound message
   */
  static async send(req: Request, res: Response): Promise<void> {
    const { contactId, message } = req.body;
    const { tenantId, userId } = req.context!;

    if (!contactId || !message) {
      res.status(400).json({ success: false, error: 'contactId and message are required' });
      return;
    }

    const contact = await prisma.contact.findFirst({ where: { id: contactId, tenantId } });
    if (!contact) {
      res.status(404).json({ success: false, error: 'Contact not found' });
      return;
    }

    if (!contact.phone) {
      res.status(400).json({ success: false, error: 'Contact has no phone number' });
      return;
    }

    // In production, call Meta WhatsApp Cloud API here
    // For now, simulate and store
    const whatsappMessage = await WhatsAppMessage.create({
      tenantId,
      contactId: contact.id,
      direction: 'outbound',
      waMessageId: `sim_${Date.now()}`,
      body: message,
      rawPayload: { simulated: true, to: contact.phone },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actor: userId,
        action: 'WHATSAPP_SENT',
        targetType: 'Contact',
        targetId: contactId,
        metadata: { phone: contact.phone, preview: message.substring(0, 100) },
      },
    });

    res.json({
      success: true,
      data: {
        messageId: whatsappMessage._id,
        to: contact.phone,
        status: 'sent',
      },
    });
  }
}
