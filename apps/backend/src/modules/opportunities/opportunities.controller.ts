import { Request, Response } from 'express';
import prisma from '../../config/db';

export class OpportunitiesController {
  static async list(req: Request, res: Response): Promise<void> {
    const { tenantId } = req.context!;
    const { stage, page = '1', pageSize = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where: any = { tenantId };
    if (stage) where.stage = stage;

    const [opportunities, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        skip,
        take,
        include: { contact: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.opportunity.count({ where }),
    ]);

    res.json({
      success: true,
      data: opportunities,
      total,
      page: parseInt(page as string),
      pageSize: take,
    });
  }

  static async create(req: Request, res: Response): Promise<void> {
    const { tenantId } = req.context!;
    const { contactId, title, value, stage } = req.body;

    // Verify contact belongs to tenant
    const contact = await prisma.contact.findFirst({ where: { id: contactId, tenantId } });
    if (!contact) {
      res.status(404).json({ success: false, error: 'Contact not found' });
      return;
    }

    const opportunity = await prisma.opportunity.create({
      data: {
        tenantId,
        contactId,
        title,
        value: value || 0,
        stage: stage || 'new',
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actor: req.context!.userId,
        action: 'OPPORTUNITY_CREATED',
        targetType: 'Opportunity',
        targetId: opportunity.id,
        metadata: { title, value, stage },
      },
    });

    res.status(201).json({ success: true, data: opportunity });
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const { tenantId } = req.context!;
    const { id } = req.params;

    const opportunity = await prisma.opportunity.findFirst({
      where: { id, tenantId },
      include: { contact: true },
    });

    if (!opportunity) {
      res.status(404).json({ success: false, error: 'Opportunity not found' });
      return;
    }

    res.json({ success: true, data: opportunity });
  }

  static async update(req: Request, res: Response): Promise<void> {
    const { tenantId } = req.context!;
    const { id } = req.params;

    const existing = await prisma.opportunity.findFirst({ where: { id, tenantId } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Opportunity not found' });
      return;
    }

    const opportunity = await prisma.opportunity.update({
      where: { id },
      data: req.body,
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actor: req.context!.userId,
        action: 'OPPORTUNITY_UPDATED',
        targetType: 'Opportunity',
        targetId: id,
        metadata: req.body,
      },
    });

    res.json({ success: true, data: opportunity });
  }
}
