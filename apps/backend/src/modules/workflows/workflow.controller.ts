import { Request, Response } from 'express';
import { Queue } from 'bullmq';
import redis from '../../config/redis';
import prisma from '../../config/db';

const leadQualificationQueue = new Queue('lead-qualification', { connection: redis });

export class WorkflowController {
  /**
   * POST /workflows/lead-qualification/run
   * Manually trigger lead qualification workflow for a contact
   */
  static async runLeadQualification(req: Request, res: Response): Promise<void> {
    const { contactId } = req.body;
    const { tenantId, userId } = req.context!;

    if (!contactId) {
      res.status(400).json({ success: false, error: 'contactId is required' });
      return;
    }

    // Verify contact
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId },
    });

    if (!contact) {
      res.status(404).json({ success: false, error: 'Contact not found' });
      return;
    }

    // Enqueue the workflow job
    const job = await leadQualificationQueue.add('qualify', {
      tenantId,
      contactId,
      userId,
      contactName: contact.name,
      contactPhone: contact.phone,
      contactEmail: contact.email,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        actor: userId,
        action: 'WORKFLOW_TRIGGERED',
        targetType: 'Contact',
        targetId: contactId,
        metadata: { workflow: 'lead-qualification', jobId: job.id },
      },
    });

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: 'queued',
        message: `Lead qualification workflow started for ${contact.name}`,
      },
    });
  }
}
