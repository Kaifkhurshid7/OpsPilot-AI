import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler.middleware';
import { rateLimiter } from './middleware/rateLimit.middleware';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import onboardingRoutes from './modules/onboarding/onboarding.routes';
import contactsRoutes from './modules/contacts/contacts.routes';
import opportunitiesRoutes from './modules/opportunities/opportunities.routes';
import tasksRoutes from './modules/tasks/tasks.routes';
import aiRoutes from './modules/ai-agent/ai.routes';
import inboxRoutes from './modules/inbox/inbox.routes';
import whatsappRoutes from './modules/whatsapp/whatsapp.routes';
import workflowRoutes from './modules/workflows/workflow.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import auditLogRoutes from './modules/audit-logs/auditLog.routes';

const logger = pino();
const app = express();

/**
 * Security and Parsing Middleware
 */
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Request Logging Middleware
 *
 * Logs all incoming requests for monitoring and debugging.
 */
app.use((req, res, next) => {
  logger.debug(
    {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
    },
    'Incoming request'
  );
  next();
});

/**
 * Health Check Endpoint
 *
 * Used by load balancers and health monitoring services.
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

/**
 * Rate Limiting
 *
 * Different limits for auth and AI endpoints to prevent abuse.
 */
app.use('/auth', rateLimiter(20, 60)); // 20 requests per minute for auth
app.use('/ai', rateLimiter(30, 60));  // 30 requests per minute for AI

/**
 * API Routes
 *
 * All routes are namespaced under /api or root path as defined.
 * Each route module handles its own authentication and validation.
 */
app.use('/auth', authRoutes);
app.use('/onboarding', onboardingRoutes);
app.use('/contacts', contactsRoutes);
app.use('/opportunities', opportunitiesRoutes);
app.use('/tasks', tasksRoutes);
app.use('/ai', aiRoutes);
app.use('/inbox', inboxRoutes);
app.use('/webhooks/whatsapp', whatsappRoutes);
app.use('/whatsapp', whatsappRoutes);
app.use('/workflows', workflowRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/audit-logs', auditLogRoutes);

/**
 * 404 Handler
 *
 * Handles requests to undefined routes.
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
    },
  });
});

/**
 * Global Error Handler
 *
 * Must be registered last. Catches all errors from middleware and routes.
 */
app.use(errorHandler);

export default app;
