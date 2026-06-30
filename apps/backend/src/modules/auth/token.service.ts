import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env';
import prisma from '../../config/db';

interface TokenPayload {
  sub: string;
  tenantId: string;
  role: 'OWNER' | 'ADMIN' | 'REP';
}

export class TokenService {
  /**
   * Generate access token (short-lived, 15min default)
   */
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY as any,
    });
  }

  /**
   * Generate refresh token and store hash in DB
   */
  static async generateRefreshToken(userId: string, tenantId: string): Promise<string> {
    const tokenId = uuidv4();
    const token = jwt.sign({ sub: userId, tenantId, jti: tokenId }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRY as any,
    });

    const tokenHash = await bcrypt.hash(token, 10);

    await prisma.refreshToken.create({
      data: {
        id: tokenId,
        tenantId,
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return token;
  }

  /**
   * Rotate refresh token — invalidate old, issue new
   */
  static async rotateRefreshToken(oldToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  } | null> {
    try {
      const payload = jwt.verify(oldToken, env.JWT_REFRESH_SECRET) as {
        sub: string;
        tenantId: string;
        jti: string;
      };

      // Find the existing refresh token record
      const existingToken = await prisma.refreshToken.findUnique({
        where: { id: payload.jti },
      });

      if (!existingToken || existingToken.revoked) {
        // Potential token reuse detected — revoke all tokens for this user
        await prisma.refreshToken.updateMany({
          where: { userId: payload.sub, tenantId: payload.tenantId },
          data: { revoked: true },
        });
        return null;
      }

      // Revoke the old token
      await prisma.refreshToken.update({
        where: { id: payload.jti },
        data: { revoked: true },
      });

      // Get user info for new tokens
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) return null;

      // Issue new tokens
      const accessToken = TokenService.generateAccessToken({
        sub: user.id,
        tenantId: user.tenantId,
        role: user.role,
      });

      const refreshToken = await TokenService.generateRefreshToken(user.id, user.tenantId);

      return { accessToken, refreshToken };
    } catch {
      return null;
    }
  }

  /**
   * Revoke all refresh tokens for a user (logout)
   */
  static async revokeAllTokens(userId: string, tenantId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, tenantId },
      data: { revoked: true },
    });
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  }
}
