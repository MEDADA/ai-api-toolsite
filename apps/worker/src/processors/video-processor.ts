/**
 * Video Generation Worker Processor.
 * Handles Seedance, Kling, and other video model generation jobs.
 */

import type { Job } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import { GenerationJobData } from '../queues/generation-queue.js';
import { validate, toUpstream, parseResponse, pollStatus } from '../adapters/video-adapter.js';
import { uploadToOSS } from '../lib/oss-uploader.js';
import { publishSSE } from '../lib/sse-emitter.js';

const SEEDANCE_UNIT_PRICE = 300; // ¥3.0/s = 300分/秒

interface VideoChannelConfig {
  access_key: string;
  secret_key: string;
  account_id: string;
  space_name: string;
}

export async function videoProcessor(
  job: Job<GenerationJobData>,
  prisma: PrismaClient
): Promise<void> {
  const { taskId, userId, modelSlug, inputParams } = job.data;

  console.log(`[VideoProcessor] Processing task ${taskId} (model: ${modelSlug})`);

  // ── Step 0: Update task status → QUEUED ────────────────────────
  await prisma.generationTask.update({
    where: { id: taskId },
    data: { status: 'QUEUED', queued_at: new Date() },
  });
  await publishSSE(taskId, 'task_queued', { task_id: taskId, queued_at: new Date().toISOString() });

  // ── Step 1: Validate params ──────────────────────────────────────
  const validation = validate(inputParams);
  if (!validation.valid) {
    await handleFailure(taskId, userId, job.data.totalCost, `Invalid params: ${validation.errors?.map(e => e.message).join(', ')}`, prisma);
    return;
  }

  const params = validation.params!;

  // ── Step 2: Get channel config ──────────────────────────────────
  const channel = await prisma.providerChannel.findFirst({
    where: { model: { slug: modelSlug }, status: 'ACTIVE' },
    orderBy: { priority: 'asc' },
  });

  if (!channel) {
    await handleFailure(taskId, userId, job.data.totalCost, 'No active channel for this model', prisma);
    return;
  }

  const config = channel.config as VideoChannelConfig;
  if (!config.access_key || !config.secret_key) {
    await handleFailure(taskId, userId, job.data.totalCost, 'Channel not configured', prisma);
    return;
  }

  // ── Step 3: Call upstream API ────────────────────────────────────
  const upstreamReq = toUpstream(params, config);

  let upstreamJobId = '';
  try {
    const response = await fetch(upstreamReq.url, {
      method: 'POST',
      headers: upstreamReq.headers,
      body: JSON.stringify(upstreamReq.body),
    });

    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      throw new Error(`Volcengine API error ${response.status}: ${JSON.stringify(data)}`);
    }

    const parsed = parseResponse(data);

    if (parsed.status === 'failed') {
      await handleFailure(taskId, userId, job.data.totalCost, parsed.error ?? 'Upstream failed', prisma);
      return;
    }

    upstreamJobId = parsed.jobId ?? (data.data as Record<string, unknown>)?.task_id as string ?? '';

    await prisma.generationTask.update({
      where: { id: taskId },
      data: { upstream_job_id: upstreamJobId, status: 'PROCESSING', started_at: new Date() },
    });
    await publishSSE(taskId, 'task_started', { task_id: taskId, started_at: new Date().toISOString() });

    // Log provider request
    await prisma.providerRequestLog.create({
      data: {
        channel_id: channel.id,
        task_id: taskId,
        upstream_job_id: upstreamJobId,
        request: upstreamReq as any,
        response: data,
        status_code: response.status,
      },
    }).catch(() => {});

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upstream call failed';
    await handleFailure(taskId, userId, job.data.totalCost, msg, prisma);
    return;
  }

  // ── Step 4: Poll until complete ─────────────────────────────────
  const timeoutAt = Date.now() + 5 * 60 * 1000;

  try {
    let pollCount = 0;
    while (Date.now() < timeoutAt) {
      await sleep(8000); // Poll every 8 seconds for video

      const pollRes = await pollStatus(upstreamJobId, config);
      pollCount++;

      if (pollRes.status === 'completed' && pollRes.result) {
        await handleSuccess(taskId, userId, job.data.totalCost, pollRes.result, params, prisma);
        return;
      }

      if (pollRes.status === 'failed') {
        await handleFailure(taskId, userId, job.data.totalCost, pollRes.result?.error ?? 'Generation failed', prisma);
        return;
      }

      await publishSSE(taskId, 'task_progress', {
        task_id: taskId,
        progress: Math.min(90, pollCount * 8),
        message: '视频生成中...',
      });
    }

    // Timeout
    await handleFailure(taskId, userId, job.data.totalCost, 'TIMEOUT', prisma);

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
  result: { outputs: Array<{ url: string; thumbnail_url?: string; duration?: number; mime_type?: string }> },
  params: { duration?: number },
  prisma: PrismaClient
) {
  // 1. Upload to OSS (optional — upstream may already be on CDN)
  const outputs = await Promise.all(
    result.outputs.map(async (output, i) => {
      const ossKey = `results/${userId}/${taskId}/video_${i}.mp4`;
      try {
        await uploadToOSS(output.url, ossKey);
      } catch {
        // Non-fatal — upstream URL still valid
      }
      return {
        task_id: taskId,
        file_url: output.url,
        thumbnail_url: output.thumbnail_url,
        duration: output.duration ?? params.duration ?? 5,
        mime_type: output.mime_type ?? 'video/mp4',
        sort_order: i,
      };
    })
  );

  await prisma.generationOutput.createMany({ data: outputs });

  // 2. Settle
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

  // 3. Mark succeeded
  await prisma.generationTask.update({
    where: { id: taskId },
    data: { status: 'SUCCEEDED', completed_at: new Date() },
  });

  await prisma.generationEvent.create({
    data: { task_id: taskId, event: 'completed', detail: { outputs: outputs.length } },
  }).catch(() => {});

  await publishSSE(taskId, 'task_completed', {
    task_id: taskId,
    outputs: outputs.map(o => ({ url: o.file_url, thumbnail_url: o.thumbnail_url, duration: o.duration })),
  });

  console.log(`[VideoProcessor] Task ${taskId} completed`);
}

async function handleFailure(
  taskId: string,
  userId: string,
  totalCost: number,
  reason: string,
  prisma: PrismaClient
) {
  // Refund
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

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
