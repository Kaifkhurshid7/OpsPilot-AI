import { Request, Response } from 'express';
import { env } from '../../config/env';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import prisma from '../../config/db';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export class AuthController {
  /**
   * GET /auth/google - Redirect to Google OAuth
   */
  static googleRedirect(_req: Request, res: Response): void {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_CALLBACK_URL,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  /**
   * GET /auth/google/callback - Handle Google OAuth callback
   */
  static async googleCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.query;

      if (!code) {
        res.status(400).json({ success: false, error: 'Authorization code required' });
        return;
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code as string,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: env.GOOGLE_CALLBACK_URL,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        res.status(400).json({ success: false, error: 'Failed to exchange code' });
        return;
      }

      // Get user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const googleUser = await userInfoResponse.json();

      // Find or create user in our DB
      const user = await AuthService.findOrCreateUser({
        googleId: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
      });

      // Generate our JWT tokens
      const tokens = await AuthService.generateTokens(user);

      // Write audit log
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          actor: user.id,
          action: 'AUTH_LOGIN',
          metadata: { method: 'google_oauth' },
        },
      });

      // Set cookies
      res.cookie('access_token', tokens.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refresh_token', tokens.refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Redirect to frontend
      const redirectUrl = user.tenant.onboarded
        ? `${env.CORS_ORIGIN}/chat`
        : `${env.CORS_ORIGIN}/onboarding`;

      res.redirect(redirectUrl);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${env.CORS_ORIGIN}/login?error=auth_failed`);
    }
  }

  /**
   * POST /auth/refresh - Rotate refresh token
   */
  static async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      res.status(401).json({ success: false, error: 'Refresh token required' });
      return;
    }

    const tokens = await TokenService.rotateRefreshToken(refreshToken);

    if (!tokens) {
      // Clear cookies on failure
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      res.status(401).json({ success: false, error: 'Invalid refresh token' });
      return;
    }

    res.cookie('access_token', tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, message: 'Tokens refreshed' });
  }

  /**
   * POST /auth/logout - Revoke tokens and clear cookies
   */
  static async logout(req: Request, res: Response): Promise<void> {
    if (req.context) {
      await TokenService.revokeAllTokens(req.context.userId, req.context.tenantId);

      await prisma.auditLog.create({
        data: {
          tenantId: req.context.tenantId,
          actor: req.context.userId,
          action: 'AUTH_LOGOUT',
        },
      });
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.json({ success: true, message: 'Logged out' });
  }

  /**
   * GET /auth/me - Get current user info
   */
  static async me(req: Request, res: Response): Promise<void> {
    if (!req.context) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.context.userId },
      include: { tenant: true },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          industry: user.tenant.industry,
          onboarded: user.tenant.onboarded,
        },
      },
    });
  }
}
