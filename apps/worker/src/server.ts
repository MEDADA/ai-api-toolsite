// Load ARK_API_KEY from .env
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

// Load ARK_API_KEY from .env
import { readFileSync } from 'fs';
const envFile = readFileSync('/Users/a/Documents/AI-API-Toolsite-v2/apps/worker/.env', 'utf8');
for (const line of envFile.split('\n')) {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

// Load environment variables
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(__dirname, '../../.env') });

/**
 * BullMQ Worker entry point for AI generation tasks.
 * Handles image, video, and audio generation via registered processors.
 */

import { Worker, Queue, Job } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { imageProcessor } from './processors/image-processor.js';
import { videoProcessor } from './processors/video-processor.js';
import { GenerationJobData } from './queues/generation-queue.js';

const REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT ?? '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_DB = parseInt(process.env.REDIS_DB ?? '0');

const redisConnection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD || undefined,
  db: REDIS_DB,
};

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

const TASK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

async function main() {
  console.log('🚀 Worker starting...');

  // ── Image Generation Worker ──────────────────────────────────────
  const imageWorker = new Worker<GenerationJobData>(
    'image-generation',
    async (job: Job<GenerationJobData>) => {
      return imageProcessor(job, prisma);
    },
    {
      connection: redisConnection,
      concurrency: 10,
    }
  );

  imageWorker.on('completed', (job) => {
    console.log(`[ImageWorker] Job ${job.id} completed for task ${job.data.taskId}`);
  });

  imageWorker.on('failed', (job, err) => {
    console.error(`[ImageWorker] Job ${job?.id} failed:`, err.message);
  });

  // ── Video Generation Worker ─────────────────────────────────────
  const videoWorker = new Worker<GenerationJobData>(
    'video-generation',
    async (job: Job<GenerationJobData>) => {
      return videoProcessor(job, prisma);
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  videoWorker.on('completed', (job) => {
    console.log(`[VideoWorker] Job ${job.id} completed for task ${job.data.taskId}`);
  });

  videoWorker.on('failed', (job, err) => {
    console.error(`[VideoWorker] Job ${job?.id} failed:`, err.message);
  });

  // ── Audio Generation Worker ─────────────────────────────────────
  const audioWorker = new Worker<GenerationJobData>(
    'audio-generation',
    async (job: Job<GenerationJobData>) => {
      // TODO: implement audio processor
      console.log(`[AudioWorker] Job ${job.id} received (not yet implemented)`);
      return { status: 'pending', message: 'Audio worker not yet implemented' };
    },
    {
      connection: redisConnection,
      concurrency: 20,
    }
  );

  audioWorker.on('completed', (job) => {
    console.log(`[AudioWorker] Job ${job.id} completed for task ${job.data.taskId}`);
  });

  audioWorker.on('failed', (job, err) => {
    console.error(`[AudioWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log(`✅ Workers registered: image(10), video(5), audio(20)`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down...`);
    await Promise.all([
      imageWorker.close(),
      videoWorker.close(),
      audioWorker.close(),
    ]);
    await prisma.$disconnect();
    console.log('✅ All workers stopped');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Worker fatal error:', err);
  process.exit(1);
});
