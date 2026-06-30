import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
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

const app = express();

// Global middleware
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/auth', rateLimiter(20, 60)); // 20 requests per minute for auth
app.use('/ai', rateLimiter(30, 60));   // 30 requests per minute for AI

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
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

// Error handling
app.use(errorHandler);

export default app;
