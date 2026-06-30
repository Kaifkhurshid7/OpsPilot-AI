import mongoose from 'mongoose';
import pino from 'pino';
import { env } from './env';

const logger = pino();

/**
 * MongoDB Connection Configuration
 *
 * Connects to MongoDB for semi-structured data storage:
 * - Chat messages and conversation history (ai_messages, ai_conversations)
 * - WhatsApp message payloads and metadata (whatsapp_messages)
 * - Email message logs (email_messages)
 * - Call transcripts (call_logs)
 *
 * Why MongoDB: Schema flexibility for varying message types and high write throughput.
 * Every collection includes tenant_id for isolation.
 *
 * @throws Error if connection fails (triggers process exit)
 */
export async function connectMongo(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      retryWrites: true,
      serverSelectionTimeoutMS: 5000,
    });

    logger.info({
      msg: 'MongoDB connected successfully',
      uri: env.MONGODB_URI.replace(/(:[^@]*@)/, ':***@'),
    });
  } catch (error) {
    logger.error(
      {
        msg: 'MongoDB connection failed',
        error: error instanceof Error ? error.message : String(error),
      },
      'Fatal: Cannot proceed without MongoDB'
    );

    process.exit(1);
  }
}

/**
 * Handle graceful shutdown
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, disconnecting MongoDB');
  await mongoose.disconnect();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, disconnecting MongoDB');
  await mongoose.disconnect();
});

export default mongoose;
