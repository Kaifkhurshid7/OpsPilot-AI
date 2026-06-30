import app from './app';
import { env } from './config/env';
import { connectMongo } from './config/mongo';
import prisma from './config/db';

async function bootstrap() {
  // Connect to MongoDB
  await connectMongo();

  // Verify Postgres connection
  await prisma.$connect();
  console.log('✅ PostgreSQL connected');

  // Start server
  const port = parseInt(env.PORT, 10);
  app.listen(port, () => {
    console.log(`🚀 OpsPilot API running on http://localhost:${port}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
