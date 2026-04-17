/**
 * Image Generation Worker Processor.
 * Handles Doubao Seedream image model generation jobs.
 * (Migrated from Replicate/FLUX to Doubao Ark API)
 */

import type { Job } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import { GenerationJobData } from '../queues/generation-queue.js';
import { validate, toUpstream, callAPI, DoubaoSeedreamParams } from '../adapters/doubao-seedream.adapter.js';
import { uploadToOSS } from '../lib/oss-uploader.js';
import { publishSSE } from '../lib/sse-emitter.js';

const ARK_API_KEY = process.env.ARK_API_KEY ?? '';
const DOUBAO_UNIT_PRICE = 50; // ¥0.5 = 50分

export async function imageProcessor(
  job: Job<GenerationJobData>,
  prisma: PrismaClient
): Promise<void> {
  const { taskId, userId, modelSlug, inputParams } = job.data;

  console.log(`[ImageProcessor] Processing task ${taskId} (model: ${modelSlug})`);

  // ── Step 0: Update task status → QUEUED ────────────────────────
  await prisma.generationTask.update({
    where: { id: taskId },
    data: {
      status: 'QUEUED',
      queued_at: new Date(),
      upstream_job_id: '',
    },
  });
  await publishSSE(taskId, 'task_queued', { task_id: taskId, queued_at: new Date().toISOString() });

  // ── Step 1: Validate params ──────────────────────────────────────
  const validation = validate(inputParams);
  if (!validation.valid) {
    await handleFailure(taskId, userId, job.data.totalCost, `Invalid params: ${validation.errors?.map(e => e.message).join(', ')}`, prisma);
    return;
  }

  const params = validation.params as DoubaoSeedreamParams;

  // ── Step 2: Get API key ─────────────────────────────────────────
  const apiKey = ARK_API_KEY || (await getChannelApiKey(prisma, modelSlug));
  if (!apiKey) {
    await handleFailure(taskId, userId, job.data.totalCost, 'No API key configured', prisma);
    return;
  }

  // ── Step 3: Build upstream request ──────────────────────────────
  const upstreamReq = toUpstream(params, apiKey);

  // ── Step 4: Update status → PROCESSING ─────────────────────────
  await prisma.generationTask.update({
    where: { id: taskId },
    data: {
      status: 'PROCESSING',
      started_at: new Date(),
      upstream_job_id: `doubao-${taskId}`,
    },
  });
  await publishSSE(taskId, 'task_started', { task_id: taskId, started_at: new Date().toISOString() });

  // ── Step 5: Call Doubao API (synchronous, no polling needed) ────
  try {
    const result = await callAPI(upstreamReq);

    // Log the request
    await logProviderRequest(prisma, modelSlug, taskId, `doubao-${taskId}`, upstreamReq, result, 200);

    // ── Step 6: Success — upload to OSS, save outputs, settle ─────
    await handleSuccess(taskId, userId, job.data.totalCost, result, params, prisma);

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Processing error';
    await handleFailure(taskId, userId, job.data.totalCost, msg, prisma);
  }
}

// ─────────────────────────────────────────────────────────────────

async function handleSuccess(
  taskId: string,
  userId: string,
  totalCost: number,
  result: { outputs: Array<{ url: string; mime_type?: string; sort_order?: number }> },
  params: DoubaoSeedreamParams,
  prisma: PrismaClient
) {
  // Parse width/height from size string (e.g. "2048x2048")
  const [widthStr, heightStr] = (params.size ?? '2048x2048').split('x');
  const width = parseInt(widthStr);
  const height = parseInt(heightStr ?? widthStr);

  // 1. Upload generated images to OSS
  const outputs = await Promise.all(
    result.outputs.map(async (output, i) => {
      try {
        const ossKey = `results/${userId}/${taskId}/output_${i}.png`;
        await uploadToOSS(output.url, ossKey);
        return {
          file_url: output.url,
          thumbnail_url: undefined as string | undefined,
          width,
          height,
          mime_type: output.mime_type ?? 'image/png',
          sort_order: output.sort_order ?? i,
        };
      } catch {
        return {
          file_url: output.url,
          width,
          height,
          mime_type: output.mime_type ?? 'image/png',
          sort_order: output.sort_order ?? i,
        };
      }
    })
  );

  // 2. Save outputs to DB
  await prisma.generationOutput.createMany({
    data: outputs.map(o => ({
      task_id: taskId,
      file_url: o.file_url,
      thumbnail_url: o.thumbnail_url,
      width: o.width,
      height: o.height,
      mime_type: o.mime_type,
      sort_order: o.sort_order,
    })),
  });

  // 3. Settle (deduct frozen → spent)
  const wallet = await prisma.walletAccount.findUnique({ where: { user_id: userId } });
  if (wallet) {
    await prisma.$transaction([
      prisma.$executeRaw`
        UPDATE wallet_account
        SET frozen_balance = frozen_balance - ${totalCost}::decimal,
            total_spent = total_spent + ${totalCost}::decimal,
            updated_at = NOW()
        WHERE user_id = ${userId}
      `,
      prisma.walletLedger.create({
        data: {
          wallet_id: wallet.id,
          user_id: userId,
          tx_type: 'TASK_SETTLE',
          amount: -totalCost,
          balance_before: Number(wallet.frozen_balance),
          balance_after: Number(wallet.frozen_balance) - totalCost,
          order_id: taskId,
          order_type: 'generation_task',
          remark: `结算扣费 ¥${totalCost / 100}`,
        },
      }),
    ]);
  }

  // 4. Mark task as succeeded
  await prisma.generationTask.update({
    where: { id: taskId },
    data: {
      status: 'SUCCEEDED',
      completed_at: new Date(),
    },
  });

  // 5. Log event
  await prisma.generationEvent.create({
    data: {
      task_id: taskId,
      event: 'completed',
      detail: { outputs: outputs.length },
    },
  });

  // 6. SSE push completed
  await publishSSE(taskId, 'task_completed', {
    task_id: taskId,
    outputs: outputs.map(o => ({ url: o.file_url, thumbnail_url: o.thumbnail_url, width: o.width, height: o.height })),
  });

  console.log(`[ImageProcessor] Task ${taskId} completed successfully`);
}

async function handleFailure(
  taskId: string,
  userId: string,
  totalCost: number,
  reason: string,
  prisma: PrismaClient
) {
  // 1. Refund frozen balance
  const wallet = await prisma.walletAccount.findUnique({ where: { user_id: userId } });
  if (wallet) {
    const availableBefore = Number(wallet.available_balance);
    await prisma.$transaction([
      prisma.$executeRaw`
        UPDATE wallet_account
        SET frozen_balance = frozen_balance - ${totalCost}::decimal,
            available_balance = available_balance + ${totalCost}::decimal,
            updated_at = NOW()
        WHERE user_id = ${userId}
      `,
      prisma.walletLedger.create({
        data: {
          wallet_id: wallet.id,
          user_id: userId,
          tx_type: 'TASK_REFUND',
          amount: totalCost,
          balance_before: availableBefore,
          balance_after: availableBefore + totalCost,
          order_id: taskId,
          order_type: 'generation_task',
          remark: `退款：${reason}`,
        },
      }),
    ]);
  }

  // 2. Mark task failed
  await prisma.generationTask.update({
    where: { id: taskId },
    data: { status: 'FAILED' },
  });

  // 3. Log event
  await prisma.generationEvent.create({
    data: { task_id: taskId, event: 'failed', detail: { reason } },
  }).catch(() => {});

  // 4. SSE push failed
  await publishSSE(taskId, 'task_failed', {
    task_id: taskId,
    error: reason,
    refunded: true,
  });

  console.error(`[ImageProcessor] Task ${taskId} failed: ${reason}`);
}

async function getChannelApiKey(prisma: PrismaClient, modelSlug: string): Promise<string> {
  const channel = await prisma.providerChannel.findFirst({
    where: {
      model: { slug: modelSlug },
      status: 'ACTIVE',
    },
  });
  if (!channel) return '';
  const config = channel.config as { api_key?: string };
  return config.api_key ?? '';
}

async function logProviderRequest(
  prisma: PrismaClient,
  modelSlug: string,
  taskId: string,
  upstreamJobId: string,
  request: { url: string; method: string; headers: Record<string, string>; body?: unknown },
  response: unknown,
  statusCode: number
) {
  const channel = await prisma.providerChannel.findFirst({
    where: { model: { slug: modelSlug } },
  });
  if (!channel) return;

  await prisma.providerRequestLog.create({
    data: {
      channel_id: channel.id,
      task_id: taskId,
      upstream_job_id: upstreamJobId,
      request: request as any,
      response: response as any,
      status_code: statusCode,
    },
  }).catch(() => {});
}
