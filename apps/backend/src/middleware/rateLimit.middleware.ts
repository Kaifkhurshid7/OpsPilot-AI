import { Request, Response, NextFunction } from 'express';
import redis from '../config/redis';

/**
 * Simple Redis-based rate limiter.
 * @param maxRequests - Max requests allowed in the window
 * @param windowSeconds - Window size in seconds
 */
export function rateLimiter(maxRequests: number, windowSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const identifier = req.context?.userId || req.ip || 'anonymous';
      const key = `ratelimit:${req.baseUrl}:${identifier}`;

      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      if (current > maxRequests) {
        res.status(429).json({
          success: false,
          error: 'Too many requests. Please try again later.',
        });
        return;
      }

      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current).toString());

      next();
    } catch (error) {
      // If Redis is down, allow the request through
      next();
    }
  };
}
