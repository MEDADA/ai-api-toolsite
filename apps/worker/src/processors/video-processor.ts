/**
 * Video Generation Worker Processor.
 * Routes to the appropriate adapter based on model slug:
 *   - doubao-seedance-1.0 → Doubao Seedance via Volcano Ark
 *   - kling-v1 → 快手可灵 Kling AI
 */

import type { Job } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import { GenerationJobData } from '../queues/generation-queue.js';
import {
  validate as seedanceValidate,
  toUpstream as seedanceToUpstream,
  parseStatusResponse,
} from '../adapters/video-adapter.js';
import { klingValidate, klingToUpstream, klingParseCreateResponse, klingPollStatus } from '../adapters/kling-video.adapter.js';
import { uploadToOSS } from '../lib/oss-uploader.js';
import { publishSSE } from '../lib/sse-emitter.js';

const DOUBAO_ARK_KEY = process.env.ARK_API_KEY ?? '';
const KLING_KEY = process.env.KLING_API_KEY ?? '';

/** Supported video model slugs */
const VIDEO_ADAPTERS: Record<string, 'seedance' | 'kling'> = {
  'doubao-seedance-1.0': 'seedance',
  'kling-v1':             'kling',
};

export async function videoProcessor(
  job: Job<GenerationJobData>,
  prisma: PrismaClient
): Promise<void> {
  const { taskId, userId, modelSlug, inputParams, totalCost } = job.data;

  console.log(`[VideoProcessor] Processing task ${taskId} (model: ${modelSlug})`);

  // ── Step 0: Update → QUEUED ────────────────────────────────
  await prisma.generationTask.update({
    where: { id: taskId },
    data: { status: 'QUEUED', queued_at: new Date(), upstream_job_id: '' },
  });
  await publishSSE(taskId, 'task_queued', { task_id: taskId });

  const adapter = VIDEO_ADAPTERS[modelSlug];
  if (adapter === 'kling') {
    await processKling(taskId, userId, modelSlug, inputParams, totalCost, prisma);
  } else {
    await processSeedance(taskId, userId, modelSlug, inputParams, totalCost, prisma);
  }
}

// ─────────────────────────────────────────────────────────────────
// Doubao Seedance (default)
// ─────────────────────────────────────────────────────────────────

async function processSeedance(
  taskId: string,
  userId: string,
  modelSlug: string,
  inputParams: Record<string, unknown>,
  totalCost: number,
  prisma: PrismaClient
): Promise<void> {
  const validation = seedanceValidate(inputParams);
  if (!validation.valid) {
    await handleFailure(taskId, userId, totalCost, `Invalid params: ${validation.errors?.map(e => e.message).join(', ')}`, prisma);
    return;
  }

  const apiKey = DOUBAO_ARK_KEY || await getChannelApiKey(prisma, modelSlug);
  if (!apiKey) {
    await handleFailure(taskId, userId, totalCost, 'No Doubao Ark API key configured', prisma);
    return;
  }

  await prisma.generationTask.update({
    where: { id: taskId },
    data: { status: 'PROCESSING', started_at: new Date(), upstream_job_id: `seedance-${taskId}` },
  });
  await publishSSE(taskId, 'task_started', { task_id: taskId });

  try {
    const upstreamReq = seedanceToUpstream(validation.params, apiKey);
    const resp = await fetch(upstreamReq.url, {
      method: 'POST',
      headers: upstreamReq.headers,
      body: JSON.stringify(upstreamReq.body),
    });

    if (!resp.ok) {
      throw new Error(`Doubao Ark API ${resp.status}: ${await resp.text()}`);
    }

    const data = await resp.json() as Record<string, unknown>;
    const parsed = parseStatusResponse(data);

    if (parsed.status === 'failed') {
      await handleFailure(taskId, userId, totalCost, parsed.error ?? 'Seedance failed', prisma);
      return;
    }

    if (parsed.status === 'completed') {
      const outputs = parsed.outputs ?? [];
      await saveOutputs(taskId, userId, totalCost, outputs, 'video/mp4', prisma);
      return;
    }

    // Polling required
    const jobId = parsed.jobId ?? '';
    const pollResult = await pollSeedance(taskId, userId, modelSlug, jobId, totalCost, prisma);
    if (pollResult.ok) {
      await saveOutputs(taskId, userId, totalCost, pollResult.outputs ?? [], 'video/mp4', prisma);
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Seedance processing error';
    await handleFailure(taskId, userId, totalCost, msg, prisma);
  }
}

async function pollSeedance(
  taskId: string,
  userId: string,
  modelSlug: string,
  jobId: string,
  totalCost: number,
  prisma: PrismaClient,
  maxRetries = 60,
  intervalMs = 5000
): Promise<{ ok: boolean; outputs?: Array<{ url: string; duration?: number }>; error?: string }> {

  for (let i = 0; i < maxRetries; i++) {
    await sleep(intervalMs);

    try {
      const resp = await fetch(
        `https://ark.cn-beijing.volces.com/api/v3/chat/completions?id=${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${DOUBAO_ARK_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!resp.ok) continue;

      const data = await resp.json() as Record<string, unknown>;
      const parsed = parseStatusResponse(data);

      if (parsed.status === 'completed') {
        return { ok: true, outputs: parsed.outputs ?? [] };
      }
      if (parsed.status === 'failed') {
        return { ok: false, error: parsed.error };
      }
    } catch (e) {
      console.error(`[SeedancePoll] ${i + 1} error:`, e);
    }
  }

  return { ok: false, error: 'Seedance polling timeout' };
}

// ─────────────────────────────────────────────────────────────────
// 快手可灵 Kling
// ─────────────────────────────────────────────────────────────────

async function processKling(
  taskId: string,
  userId: string,
  modelSlug: string,
  inputParams: Record<string, unknown>,
  totalCost: number,
  prisma: PrismaClient
): Promise<void> {
  const validation = klingValidate(inputParams);
  if (!validation.valid) {
    await handleFailure(taskId, userId, totalCost, `Invalid params: ${validation.errors?.map(e => e.message).join(', ')}`, prisma);
    return;
  }

  const apiKey = KLING_KEY || await getChannelApiKey(prisma, modelSlug);
  if (!apiKey) {
    await handleFailure(taskId, userId, totalCost, 'No Kling API key configured', prisma);
    return;
  }

  await prisma.generationTask.update({
    where: { id: taskId },
    data: { status: 'PROCESSING', started_at: new Date(), upstream_job_id: `kling-${taskId}` },
  });
  await publishSSE(taskId, 'task_started', { task_id: taskId });

  try {
    // Step 1: Create task
    const upstreamReq = klingToUpstream(validation.params);
    const createResp = await fetch(upstreamReq.url, {
      method: 'POST',
      headers: { ...upstreamReq.headers, 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(upstreamReq.body),
    });

    if (!createResp.ok) {
      throw new Error(`Kling create failed (${createResp.status}): ${await createResp.text()}`);
    }

    const createData = await createResp.json() as Record<string, unknown>;
    const parsed = klingParseCreateResponse(createData);

    if (parsed.status === 'failed') {
      await handleFailure(taskId, userId, totalCost, parsed.error ?? 'Kling task creation failed', prisma);
      return;
    }
    if (parsed.status === 'completed') {
      // Synchronous completion (rare)
      await saveOutputs(taskId, userId, totalCost, [{ url: '', duration: 5 }], 'video/mp4', prisma);
      return;
    }

    // Step 2: Poll for completion
    const jobId = parsed.jobId!;
    console.log(`[VideoProcessor/Kling] Polling task ${jobId}`);
    const pollResult = await klingPollStatus(jobId);

    if (pollResult.status === 'failed') {
      await handleFailure(taskId, userId, totalCost, pollResult.error ?? 'Kling generation failed', prisma);
      return;
    }

    const outputs = pollResult.outputs ?? [];
    await saveOutputs(taskId, userId, totalCost, outputs, 'video/mp4', prisma);

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kling processing error';
    await handleFailure(taskId, userId, totalCost, msg, prisma);
  }
}

// ─────────────────────────────────────────────────────────────────
// Shared: save outputs + settle wallet
// ─────────────────────────────────────────────────────────────────

async function saveOutputs(
  taskId: string,
  userId: string,
  totalCost: number,
  outputs: Array<{ url: string; duration?: number; thumbnail_url?: string }>,
  mimeType: string,
  prisma: PrismaClient
) {
  // Upload to OSS
  const saved = await Promise.all(
    outputs.map(async (o, i) => {
      let ossUrl = o.url;
      if (ossUrl) {
        const key = `results/${userId}/${taskId}/output_${i}.mp4`;
        try {
          await uploadToOSS(ossUrl, key);
          ossUrl = key; // use OSS key
        } catch {
          // Non-fatal
        }
      }
      return {
        file_url: o.url,
        thumbnail_url: o.thumbnail_url,
        duration: o.duration ?? 5,
        mime_type: mimeType,
        sort_order: i,
      };
    })
  );

  await prisma.generationOutput.createMany({
    data: saved.map(o => ({ task_id: taskId, ...o })),
  });

  await settleWallet(taskId, userId, totalCost, prisma);

  await prisma.generationTask.update({
    where: { id: taskId },
    data: { status: 'SUCCEEDED', completed_at: new Date() },
  });

  await prisma.generationEvent.create({
    data: { task_id: taskId, event: 'completed', detail: { outputs: saved.length } },
  }).catch(() => {});

  await publishSSE(taskId, 'task_completed', {
    task_id: taskId,
    outputs: saved.map(o => ({ url: o.file_url, thumbnail_url: o.thumbnail_url, duration: o.duration })),
  });

  console.log(`[VideoProcessor] Task ${taskId} completed with ${saved.length} output(s)`);
}

async function settleWallet(taskId: string, userId: string, totalCost: number, prisma: PrismaClient) {
  const wallet = await prisma.walletAccount.findUnique({ where: { user_id: userId } });
  if (!wallet) return;

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
        remark: `视频结算 ¥${totalCost / 100}`,
      },
    }),
  ]);
}

async function handleFailure(
  taskId: string,
  userId: string,
  totalCost: number,
  reason: string,
  prisma: PrismaClient
) {
  const wallet = await prisma.walletAccount.findUnique({ where: { user_id: userId } });
  if (wallet) {
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
          balance_before: Number(wallet.available_balance),
          balance_after: Number(wallet.available_balance) + totalCost,
          order_id: taskId,
          order_type: 'generation_task',
          remark: `视频退款：${reason}`,
        },
      }),
    ]);
  }

  await prisma.generationTask.update({
    where: { id: taskId },
    data: { status: 'FAILED' },
  });

  await prisma.generationEvent.create({
    data: { task_id: taskId, event: 'failed', detail: { reason } },
  }).catch(() => {});

  await publishSSE(taskId, 'task_failed', { task_id: taskId, error: reason, refunded: true });
  console.error(`[VideoProcessor] Task ${taskId} failed: ${reason}`);
}

async function getChannelApiKey(prisma: PrismaClient, modelSlug: string): Promise<string> {
  const channel = await prisma.providerChannel.findFirst({
    where: { model_id: modelSlug, status: 'ACTIVE' },
  });
  const config = (channel?.config ?? {}) as Record<string, string>;
  return config.api_key ?? '';
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
