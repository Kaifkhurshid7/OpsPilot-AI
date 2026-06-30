import dotenv from 'dotenv';
import { z } from 'zod';
import pino from 'pino';

dotenv.config();

/**
 * Environment Configuration Schema
 *
 * Validates and provides typed access to all environment variables.
 * Fails fast on startup if any required variables are missing or invalid.
 */
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000).pipe(z.number().positive()),

  // PostgreSQL Database
  DATABASE_URL: z.string().url('PostgreSQL connection URL must be valid'),

  // MongoDB (Chat messages, webhook payloads)
  MONGODB_URI: z.string().url('MongoDB connection URL must be valid'),

  // Redis (Cache, sessions, job queue)
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  // Google OAuth 2.0 (PKCE flow)
  GOOGLE_CLIENT_ID: z.string().min(1, 'Google OAuth client ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'Google OAuth client secret is required'),
  GOOGLE_CALLBACK_URL: z.string().url().default('http://localhost:4000/auth/google/callback'),

  // JWT Authentication
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT access secret must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT refresh secret must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Google Gemini API (AI agent)
  GEMINI_API_KEY: z.string().min(1, 'Gemini API key is required'),

  // WhatsApp Cloud API (optional for sandbox mode)
  WHATSAPP_TOKEN: z.string().default(''),
  WHATSAPP_VERIFY_TOKEN: z.string().default('opspilot-verify'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),
  WHATSAPP_APP_SECRET: z.string().default(''),

  // Frontend CORS Configuration
  CORS_ORIGIN: z.string().url().default('http://localhost:3000'),
});

type Env = z.infer<typeof envSchema>;

/**
 * Validates and returns environment configuration.
 * Throws descriptive error on validation failure.
 */
function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const logger = pino();
    const errors = parsed.error.flatten().fieldErrors;
    
    logger.error({
      msg: 'Environment validation failed',
      errors,
    });

    const messages = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(', ')}`)
      .join('\n');

    throw new Error(`Invalid environment variables:\n${messages}`);
  }

  return parsed.data;
}

export const env = validateEnv();

/**
 * Type-safe environment configuration object.
 * All values are guaranteed to be present and valid.
 */
export type EnvConfig = typeof env;
