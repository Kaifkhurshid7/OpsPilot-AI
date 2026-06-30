import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000'),

  // PostgreSQL
  DATABASE_URL: z.string(),

  // MongoDB
  MONGODB_URI: z.string(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:4000/auth/google/callback'),

  // JWT
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Gemini AI
  GEMINI_API_KEY: z.string(),

  // WhatsApp
  WHATSAPP_TOKEN: z.string().default(''),
  WHATSAPP_VERIFY_TOKEN: z.string().default('opspilot-verify'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),
  WHATSAPP_APP_SECRET: z.string().default(''),

  // Frontend
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
