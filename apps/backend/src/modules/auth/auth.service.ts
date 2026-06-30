import prisma from '../../config/db';
import { TokenService } from './token.service';

interface GoogleUser {
  googleId: string;
  email: string;
  name: string;
}

export class AuthService {
  /**
   * Find or create user from Google OAuth data.
   * If first-time user, create a new tenant for them.
   */
  static async findOrCreateUser(googleUser: GoogleUser) {
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { googleId: googleUser.googleId },
      include: { tenant: true },
    });

    if (user) {
      return user;
    }

    // First-time user — create tenant + user
    const tenant = await prisma.tenant.create({
      data: {
        name: `${googleUser.name}'s Business`,
        onboarded: false,
      },
    });

    user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.googleId,
        role: 'OWNER',
      },
      include: { tenant: true },
    });

    return user;
  }

  /**
   * Generate both access and refresh tokens for a user.
   */
  static async generateTokens(user: { id: string; tenantId: string; role: string }) {
    const accessToken = TokenService.generateAccessToken({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role as 'OWNER' | 'ADMIN' | 'REP',
    });

    const refreshToken = await TokenService.generateRefreshToken(user.id, user.tenantId);

    return { accessToken, refreshToken };
  }
}
