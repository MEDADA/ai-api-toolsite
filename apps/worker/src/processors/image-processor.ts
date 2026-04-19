/**
 * Image Generation Worker Processor.
 * Routes to the appropriate adapter based on model slug:
 *   - doubao-seedream-1.0-pro → Doubao Seedream (Ark API)
 *   - flux-1.1-pro → FLUX via Replicate
 */

import type { Job } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import { GenerationJobData } from '../queues/generation-queue.js';
import { validate as doubaoValidate, toUpstream as doubaoToUpstream, callAPI } from '../adapters/doubao-seedream.adapter.js';
import type { DoubaoSeedreamParams } from '../adapters/doubao-seedream.adapter.js';
import { fluxValidate, fluxToUpstream, fluxPollStatus, fluxParseCreateResponse } from '../adapters/flux-replicate.adapter.js';
import type { FluxProParams } from '../adapters/flux-replicate.adapter.js';
import { uploadToOSS } from '../lib/oss-uploader.js';
import { publishSSE } from '../lib/sse-emitter.js';

const ARK_API_KEY = process.env.ARK_API_KEY ?? '';
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN ?? '';

/** Supported image model slugs */
const IMAGE_ADAPTERS: Record<string, 'doubao' | 'flux'> = {
  'doubao-seedream-1.0-pro': 'doubao',
  'flux-1.1-pro':             'flux',
};

export async function imageProcessor(
  job: Job<GenerationJobData>,
  prisma: PrismaClient
): Promise<void> {
  const { taskId, userId, modelSlug, inputParams, totalCost } = job.data;

  console.log(`[ImageProcessor] Processing task ${taskId} (model: ${modelSlug})`);

  // ── Step 0: Update → QUEUED ──────────────────────────────────
  await prisma.generationTask.update({
    where: { id: taskId },
    data: { status: 'QUEUED', queued_at: new Date(), upstream_job_id: '' },
  });
  await publishSSE(taskId, 'task_queued', { task_id: taskId });

  // ── Step 1: Dispatch to adapter ────────────────────────────────
  const adapter = IMAGE_ADAPTERS[modelSlug];

  if (adapter === 'flux') {
    await processFlux(taskId, userId, modelSlug, inputParams, totalCost, prisma);
  } else {
    // Default: Doubao Seedream
    await processDoubao(taskId, userId, modelSlug, inputParams, totalCost, prisma);
  }
}

// ─────────────────────────────────────────────────────────────────
// Doubao Seedream (default image model)
// ─────────────────────────────────────────────────────────────────

async function processDoubao(
  taskId: string,
  userId: string,
  modelSlug: string,
  inputParams: Record<string, unknown>,
  totalCost: number,
  prisma: PrismaClient
): Promise<void> {
  // Validate
  const validation = doubaoValidate(inputParams);
  if (!validation.valid) {
    await handleFailure(taskId, userId, totalCost, `Invalid params: ${validation.errors?.map(e => e.message).join(', ')}`, prisma);
    return;
  }
  const params = validation.params as DoubaoSeedreamParams;

  const apiKey = ARK_API_KEY || await getChannelApiKey(prisma, modelSlug);
  if (!apiKey) {
    await handleFailure(taskId, userId, totalCost, 'No Doubao API key configured', prisma);
    return;
  }

  const upstreamReq = doubaoToUpstream(params, apiKey);

  await prisma.generationTask.update({
    where: { id: taskId },
    data: { status: 'PROCESSING', started_at: new Date(), upstream_job_id: `doubao-${taskId}` },
  });
  await publishSSE(taskId, 'task_started', { task_id: taskId });

  try {
    const result = await callAPI(upstreamReq);
    await logProviderRequest(prisma, modelSlug, taskId, `doubao-${taskId}`, upstreamReq, result, 200);
    await saveOutputs(taskId, userId, totalCost, result.outputs ?? [], params, 'image/png', prisma);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Doubao processing error';
    await handleFailure(taskId, userId, totalCost, msg, prisma);
  }
}

// ─────────────────────────────────────────────────────────────────
// FLUX via Replicate
// ─────────────────────────────────────────────────────────────────

async function processFlux(
  taskId: string,
  userId: string,
  modelSlug: string,
  inputParams: Record<string, unknown>,
  totalCost: number,
  prisma: PrismaClient
): Promise<void> {
  // Validate
  const validation = fluxValidate(inputParams);
  if (!validation.valid) {
    await handleFailure(taskId, userId, totalCost, `Invalid params: ${validation.errors?.map(e => e.message).join(', ')}`, prisma);
    return;
  }
  const params = validation.params as FluxProParams;

  const apiKey = REPLICATE_TOKEN || await getChannelApiKey(prisma, modelSlug);
  if (!apiKey) {
    await handleFailure(taskId, userId, totalCost, 'No Replicate API token configured', prisma);
    return;
  }

  await prisma.generationTask.update({
    where: { id: taskId },
    data: { status: 'PROCESSING', started_at: new Date(), upstream_job_id: `flux-${taskId}` },
  });
  await publishSSE(taskId, 'task_started', { task_id: taskId });

  try {
    // Step 1: Create prediction
    const upstreamReq = fluxToUpstream(params);
    const createResp = await fetch(upstreamReq.url, {
      method: 'POST',
      headers: upstreamReq.headers,
      body: JSON.stringify(upstreamReq.body),
    });

    if (!createResp.ok) {
      const text = await createResp.text();
      throw new Error(`Replicate create failed (${createResp.status}): ${text}`);
    }

    const createData = await createResp.json() as Record<string, unknown>;
    await logProviderRequest(prisma, modelSlug, taskId, `flux-${taskId}`, upstreamReq, createData, createResp.status);

    const parsed = fluxParseCreateResponse(createData);
    if (parsed.status === 'failed') {
      await handleFailure(taskId, userId, totalCost, parsed.error ?? 'FLUX creation failed', prisma);
      return;
    }
    if (parsed.status === 'completed') {
      // synchronous success (e.g. FLUX schnell)
      const outputs = [{ url: (createData.output as string[])?.[0] ?? '', mime_type: 'image/png', sort_order: 0 }];
      await saveOutputs(taskId, userId, totalCost, outputs, params, 'image/png', prisma);
      return;
    }

    // Step 2: Poll for completion
    const jobId = parsed.jobId!;
    console.log(`[ImageProcessor/FLUX] Polling prediction ${jobId}`);
    const pollResult = await fluxPollStatus(jobId);

    if (pollResult.status === 'failed') {
      await handleFailure(taskId, userId, totalCost, pollResult.error ?? 'FLUX polling failed', prisma);
      return;
    }

    // Step 3: Save outputs
    const outputs = pollResult.outputs.map((o, i) => ({
      url: o.url,
      mime_type: 'image/png',
      sort_order: i,
    }));
    await saveOutputs(taskId, userId, totalCost, outputs, params, 'image/png', prisma);

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'FLUX processing error';
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
  outputs: Array<{ url: string; mime_type?: string; sort_order?: number }>,
  params: DoubaoSeedreamParams | FluxProParams,
  defaultMime: string,
  prisma: PrismaClient
) {
  // Determine dimensions
  let width = 1024, height = 1024;
  const p = params as Record<string, unknown>;
  if (p.width && p.height) {
    width = Number(p.width);
    height = Number(p.height);
  } else if (p.size) {
    const parts = String(p.size).split('x');
    if (parts.length === 2) {
      width = parseInt(parts[0]);
      height = parseInt(parts[1]);
    }
  }

  // Upload to OSS
  const saved = await Promise.all(
    outputs.map(async (output, i) => {
      const ossKey = `results/${userId}/${taskId}/output_${i}.png`;
      try {
        await uploadToOSS(output.url, ossKey);
      } catch {
        // Non-fatal: use CDN URL directly
      }
      return {
        file_url: output.url,
        thumbnail_url: undefined as string | undefined,
        width,
        height,
        mime_type: output.mime_type ?? defaultMime,
        sort_order: output.sort_order ?? i,
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
    outputs: saved.map(o => ({ url: o.file_url, thumbnail_url: o.thumbnail_url, width: o.width, height: o.height })),
  });

  console.log(`[ImageProcessor] Task ${taskId} completed with ${saved.length} output(s)`);
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
        remark: `结算扣费 ¥${totalCost / 100}`,
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
  console.error(`[ImageProcessor] Task ${taskId} failed: ${reason}`);
}

async function getChannelApiKey(prisma: PrismaClient, modelSlug: string): Promise<string> {
  const channel = await prisma.providerChannel.findFirst({
    where: { model_id: modelSlug, status: 'ACTIVE' },
  });
  const config = (channel?.config ?? {}) as Record<string, string>;
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
  const channel = await prisma.providerChannel.findFirst({ where: { model_id: modelSlug } });
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
