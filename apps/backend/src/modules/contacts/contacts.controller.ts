import { Request, Response } from 'express';
import prisma from '../../config/db';

export class ContactsController {
  static async list(req: Request, res: Response): Promise<void> {
    const { tenantId } = req.context!;
    const { page = '1', pageSize = '20', search } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where: any = { tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
      ];
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.contact.count({ where }),
    ]);

    res.json({
      success: true,
      data: contacts,
      total,
      page: parseInt(page as string),
      pageSize: take,
    });
  }

  static async create(req: Request, res: Response): Promise<void> {
    const { tenantId } = req.context!;
    const { name, phone, email, source, tags } = req.body;

    const contact = await prisma.contact.create({
      data: {
        tenantId,
        name,
        phone,
        email,
        source,
        tags: tags || [],
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actor: req.context!.userId,
        action: 'CONTACT_CREATED',
        targetType: 'Contact',
        targetId: contact.id,
        metadata: { name, source },
      },
    });

    res.status(201).json({ success: true, data: contact });
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const { tenantId } = req.context!;
    const { id } = req.params;

    const contact = await prisma.contact.findFirst({
      where: { id, tenantId },
      include: { opportunities: true, tasks: true },
    });

    if (!contact) {
      res.status(404).json({ success: false, error: 'Contact not found' });
      return;
    }

    res.json({ success: true, data: contact });
  }

  static async update(req: Request, res: Response): Promise<void> {
    const { tenantId } = req.context!;
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.contact.findFirst({ where: { id, tenantId } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Contact not found' });
      return;
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: req.body,
    });

    res.json({ success: true, data: contact });
  }

  static async delete(req: Request, res: Response): Promise<void> {
    const { tenantId } = req.context!;
    const { id } = req.params;

    const existing = await prisma.contact.findFirst({ where: { id, tenantId } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Contact not found' });
      return;
    }

    await prisma.contact.delete({ where: { id } });

    res.json({ success: true, message: 'Contact deleted' });
  }
}
