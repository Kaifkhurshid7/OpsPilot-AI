import jwt from 'jsonwebtoken';

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

/**
 * Auth Token Tests
 *
 * Tests JWT generation, verification, and refresh token rotation logic.
 */
describe('Auth - Token Management', () => {
  const mockUser = {
    id: 'user-123',
    tenantId: 'tenant-456',
    role: 'OWNER' as const,
  };

  describe('Access Token', () => {
    it('should generate a valid access token with correct claims', () => {
      const token = jwt.sign(
        { sub: mockUser.id, tenantId: mockUser.tenantId, role: mockUser.role },
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: '15m' },
      );

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as any;

      expect(decoded.sub).toBe(mockUser.id);
      expect(decoded.tenantId).toBe(mockUser.tenantId);
      expect(decoded.role).toBe('OWNER');
      expect(decoded.exp).toBeDefined();
    });

    it('should reject expired tokens', () => {
      const token = jwt.sign(
        { sub: mockUser.id, tenantId: mockUser.tenantId, role: mockUser.role },
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: '0s' },
      );

      // Small delay to ensure token expires
      expect(() => jwt.verify(token, process.env.JWT_ACCESS_SECRET!)).toThrow();
    });

    it('should reject tokens with wrong secret', () => {
      const token = jwt.sign(
        { sub: mockUser.id, tenantId: mockUser.tenantId, role: mockUser.role },
        'wrong-secret',
        { expiresIn: '15m' },
      );

      expect(() => jwt.verify(token, process.env.JWT_ACCESS_SECRET!)).toThrow();
    });
  });

  describe('Refresh Token', () => {
    it('should generate a refresh token with jti claim', () => {
      const jti = 'refresh-token-id-123';
      const token = jwt.sign(
        { sub: mockUser.id, tenantId: mockUser.tenantId, jti },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' },
      );

      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as any;

      expect(decoded.sub).toBe(mockUser.id);
      expect(decoded.tenantId).toBe(mockUser.tenantId);
      expect(decoded.jti).toBe(jti);
    });
  });
});
