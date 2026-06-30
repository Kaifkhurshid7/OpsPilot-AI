import { Request, Response } from 'express';
import { WhatsAppMessage } from '../whatsapp/whatsapp.model';
import { EmailMessage } from './email.model';
import { CallLog } from './callLog.model';
import prisma from '../../config/db';

export class InboxController {
  /**
   * GET /inbox/:contactId/timeline - Unified timeline
   */
  static async getTimeline(req: Request, res: Response): Promise<void> {
    const { contactId } = req.params;
    const { tenantId } = req.context!;

    // Verify contact belongs to tenant
    const contact = await prisma.contact.findFirst({ where: { id: contactId, tenantId } });
    if (!contact) {
      res.status(404).json({ success: false, error: 'Contact not found' });
      return;
    }

    // Fetch from all channels in parallel
    const [whatsappMessages, emailMessages, callLogs] = await Promise.all([
      WhatsAppMessage.find({ tenantId, contactId }).sort({ createdAt: -1 }).limit(50).lean(),
      EmailMessage.find({ tenantId, contactId }).sort({ createdAt: -1 }).limit(50).lean(),
      CallLog.find({ tenantId, contactId }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    // Merge and sort
    const timeline = [
      ...whatsappMessages.map((m: any) => ({
        id: m._id.toString(),
        channel: 'whatsapp' as const,
        direction: m.direction,
        body: m.body,
        aiSummary: m.aiSummary,
        sentiment: m.sentiment,
        intent: m.intent,
        createdAt: m.createdAt,
      })),
      ...emailMessages.map((m: any) => ({
        id: m._id.toString(),
        channel: 'email' as const,
        direction: m.direction,
        body: m.body,
        subject: m.subject,
        aiSummary: m.aiSummary,
        sentiment: m.sentiment,
        intent: m.intent,
        createdAt: m.createdAt,
      })),
      ...callLogs.map((m: any) => ({
        id: m._id.toString(),
        channel: 'call' as const,
        direction: m.direction,
        body: m.transcript || `Call (${m.durationSec}s)`,
        aiSummary: m.aiSummary,
        sentiment: m.sentiment,
        durationSec: m.durationSec,
        createdAt: m.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, data: timeline, contact });
  }
}
