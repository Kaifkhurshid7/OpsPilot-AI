import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import { Worker } from 'bullmq';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import { PrismaClient } from '../../../packages/prisma/generated/client';
import { processLeadQualification } from './jobs/leadQualification.job';
import { processWhatsappSummarize } from './jobs/whatsappSummarize.job';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const prisma = new PrismaClient();

async function start() {
  // Connect MongoDB
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/opspilot');
  console.log('✅ Worker: MongoDB connected');

  // Connect Postgres
  await prisma.$connect();
  console.log('✅ Worker: PostgreSQL connected');

  // Lead Qualification Worker
  const leadWorker = new Worker(
    'lead-qualification',
    async (job) => {
      console.log(`🔄 Processing lead-qualification job ${job.id}`);
      await processLeadQualification(job.data, prisma);
    },
    { connection: redis as any, concurrency: 5 },
  );

  leadWorker.on('completed', (job) => {
    console.log(`✅ Lead qualification completed: ${job.id}`);
  });

  leadWorker.on('failed', (job, err) => {
    console.error(`❌ Lead qualification failed: ${job?.id}`, err.message);
  });

  // WhatsApp Summarize Worker
  const summarizeWorker = new Worker(
    'whatsapp-summarize',
    async (job) => {
      console.log(`🔄 Processing whatsapp-summarize job ${job.id}`);
      await processWhatsappSummarize(job.data, prisma);
    },
    { connection: redis as any, concurrency: 5 },
  );

  summarizeWorker.on('completed', (job) => {
    console.log(`✅ WhatsApp summarize completed: ${job.id}`);
  });

  summarizeWorker.on('failed', (job, err) => {
    console.error(`❌ WhatsApp summarize failed: ${job?.id}`, err.message);
  });

  console.log('🚀 Worker started — listening for jobs');
}

start().catch((err) => {
  console.error('❌ Worker failed to start:', err);
  process.exit(1);
});
