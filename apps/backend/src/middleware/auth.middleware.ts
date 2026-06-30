import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: 'OWNER' | 'ADMIN' | 'REP';
}

declare global {
  namespace Express {
    interface Request {
      context?: AuthContext;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.access_token;

  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
      sub: string;
      tenantId: string;
      role: 'OWNER' | 'ADMIN' | 'REP';
    };

    req.context = {
      userId: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
    };

    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: Array<'OWNER' | 'ADMIN' | 'REP'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.context) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.context.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
