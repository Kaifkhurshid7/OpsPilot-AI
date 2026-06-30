import app from './app';
import { env } from './config/env';
import { connectMongo } from './config/mongo';
import prisma from './config/db';
import pino from 'pino';

const logger = pino();

/**
 * Application Bootstrap
 *
 * Initializes all required services and starts the HTTP server:
 * 1. Validates environment configuration
 * 2. Connects to MongoDB
 * 3. Verifies PostgreSQL connection
 * 4. Initializes Redis (via app middleware)
 * 5. Starts HTTP server
 */
async function bootstrap(): Promise<void> {
  try {
    // MongoDB connection
    await connectMongo();

    // PostgreSQL connection verification
    await prisma.$connect();
    logger.info('PostgreSQL connected successfully');

    // Start HTTP server
    const port = env.PORT;
    const server = app.listen(port, () => {
      logger.info(
        {
          port,
          environment: env.NODE_ENV,
          timestamp: new Date().toISOString(),
        },
        'OpsPilot API server started'
      );
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error(
        {
          reason,
          promise,
        },
        'Unhandled rejection detected'
      );
    });

    // Graceful shutdown handler
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, initiating graceful shutdown');

      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Server shut down gracefully');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after 30 seconds');
        process.exit(1);
      }, 30000);
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Fatal error during application bootstrap'
    );

    process.exit(1);
  }
}

// Start application
bootstrap();
