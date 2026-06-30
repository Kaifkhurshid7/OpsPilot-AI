import { Request, Response, NextFunction } from 'express';

/**
 * Ensures that the request has a valid tenant context.
 * This is applied after authMiddleware to guarantee tenant_id is available.
 */
export function tenantScope(req: Request, res: Response, next: NextFunction): void {
  if (!req.context?.tenantId) {
    res.status(403).json({ success: false, error: 'Tenant context required' });
    return;
  }
  next();
}
