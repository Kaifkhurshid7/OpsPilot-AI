import { Request, Response } from 'express';
import prisma from '../../config/db';

export class OnboardingController {
  static async createBusiness(req: Request, res: Response): Promise<void> {
    const { businessName, industry } = req.body;
    const { tenantId } = req.context!;

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: businessName,
        industry: industry || null,
        onboarded: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actor: req.context!.userId,
        action: 'TENANT_ONBOARDED',
        targetType: 'Tenant',
        targetId: tenantId,
        metadata: { businessName, industry },
      },
    });

    res.json({
      success: true,
      data: tenant,
    });
  }
}
