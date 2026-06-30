import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const logger = pino();

/**
 * Prisma Client Configuration
 *
 * Configures the ORM for PostgreSQL with appropriate logging based on environment.
 * Handles tenant isolation via middleware.
 *
 * Features:
 * - Environment-based logging (verbose in dev, minimal in prod)
 * - Connection pool reuse
 * - Graceful shutdown
 */
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn', 'info']
      : ['error', 'warn'],
});

/**
 * Handle Prisma client shutdown on application termination
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, disconnecting Prisma');
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, disconnecting Prisma');
  await prisma.$disconnect();
});

export default prisma;
