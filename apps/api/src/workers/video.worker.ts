/**
 * Video Generation Worker — BullMQ
 *
 * 消费 video-generation 队列中的任务，调用适配器执行生成，
 * 更新数据库状态，通过 Redis PubSub 推送 SSE 事件。
 */

import { Worker, Job } from 'bullmq';
import { prisma } from '@ai-toolsite/db';
import { env } from '../config/env.js';
import { emitSSEEvent } from '../services/task.service.js';

// Lazy-load adapters to avoid circular deps
async function getAdapter(slug: string) {
  if (slug.includes('seedance') || slug.includes('kling')) {
    const { volcanoArkAdapter } = await import('../adapters/volcano-ark.adapter.js');
    return volcanoArkAdapter;
  }
  // Fallback: mock adapter for dev
  const { mockAdapter } = await import('../adapters/mock.adapter.js');
  return mockAdapter;
}

const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DB,
};

async function processVideoJob(job: Job) {
  const { taskId, userId, modelSlug, inputParams, totalCost } = job.data as {
    taskId: string; userId: string; modelSlug: string;
    modelId: string; inputParams: Record<string, unknown>; totalCost: number;
  };

  console.log(`[video-worker] Processing task=${taskId} model=${modelSlug}`);

  // Emit PROCESSING status
  await emitSSEEvent(taskId, 'task_processing', { task_id: taskId });

  // Update DB status → PROCESSING
  await prisma.generationTask.update({
    where: { id: taskId },
    data: { status: 'PROCESSING' },
  }).catch(() => { /* task may have been cancelled */ });

  try {
    const adapter = await getAdapter(modelSlug);

    // Validate params
    const validation = adapter.validate(inputParams);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
    }

    // Generate
    const result = await adapter.generate(validation.params!);

    if (result.status === 'failed') {
      // Settle (charge) even on failure — consumed resources
      await settleTask(taskId, userId, totalCost, result.outputs, []);
      await emitSSEEvent(taskId, 'task_failed', { task_id: taskId, error: result.error });
      return;
    }

    // Save outputs + settle (charge user)
    await settleTask(taskId, userId, totalCost, result.outputs, []);

    await emitSSEEvent(taskId, 'task_completed', {
      task_id: taskId,
      outputs: result.outputs.map(o => ({
        url: o.url,
        thumbnail_url: (o as any).thumbnail_url,
        width: o.width,
        height: o.height,
        duration: o.duration,
      })),
    });

    console.log(`[video-worker] ✅ Task ${taskId} completed with ${result.outputs.length} outputs`);
  } catch (err: any) {
    console.error(`[video-worker] ❌ Task ${taskId} failed:`, err.message);

    // Refund frozen amount
    try {
      const task = await prisma.generationTask.findUnique({ where: { id: taskId } });
      if (task && task.status !== 'FAILED' && task.status !== 'SUCCEEDED') {
        await prisma.generationTask.update({
          where: { id: taskId },
          data: { status: 'FAILED' },
        });
        await emitSSEEvent(taskId, 'task_failed', { task_id: taskId, error: err.message });
      }
    } catch {}

    throw err; // Re-throw so BullMQ can retry if configured
  }
}

/**
 * Save outputs and settle (charge) the user.
 */
async function settleTask(
  taskId: string,
  userId: string,
  totalCost: number,
  outputs: Array<{ url: string; mime_type?: string; width?: number; height?: number; duration?: number; sort_order?: number; [key: string]: any }>,
  _cancelOutputs: string[]
) {
  await prisma.$transaction(async (tx) => {
    // Delete cancelled outputs
    // Save new outputs
    if (outputs.length > 0) {
      await tx.generationOutput.createMany({
        data: outputs.map((o, i) => ({
          task_id: taskId,
          file_url: o.url,
          thumbnail_url: (o as any).thumbnail_url || undefined,
          width: o.width || null,
          height: o.height || null,
          duration: o.duration || null,
          mime_type: o.mime_type || 'video/mp4',
          sort_order: o.sort_order ?? i,
        })),
        skipDuplicates: true,
      });
    }

    // Update task → SUCCEEDED and settle wallet
    await tx.generationTask.update({
      where: { id: taskId },
      data: {
        status: 'SUCCEEDED',
        completed_at: new Date(),
      },
    });

    // Settlement: move from frozen to spent
    const { walletService } = await import('../services/wallet.service.js');
    await walletService.settle(userId, taskId, totalCost);
  });
}

// Create and start the worker
const worker = new Worker('video-generation', processVideoJob, {
  connection: redisConfig,
  concurrency: 5,
});

worker.on('completed', (job) => {
  console.log(`[video-worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[video-worker] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('[video-worker] Worker error:', err.message);
});

console.log('[video-worker] 🚀 Video generation worker started');

export { worker };
