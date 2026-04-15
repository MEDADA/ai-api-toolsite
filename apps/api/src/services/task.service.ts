import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@ai-toolsite/db';
import { walletService } from './wallet.service.js';
import { riskService } from './risk.service.js';
import { modelService } from './model.service.js';
import { generateId, hashString } from '../lib/id.js';
import { getQueueByType } from '../queues/index.js';
import { TASK_TIMEOUT_MS, SSE_HEARTBEAT_MS } from '@ai-toolsite/shared';

async function getRedis() {
  try {
    const { redis } = await import('../plugins/redis.js');
    return redis;
  } catch {
    return null;
  }
}

export const taskService = {
  /**
   * Create a generation task.
   * Includes idempotency check via idem_key.
   */
  async createTask(
    userId: string,
    params: Record<string, unknown>,
    requestId: string
  ): Promise<{ ok: false; code: string; message: string } | { ok: true; data: Record<string, unknown> }> {
    const modelSlug = params.model_slug as string;

    // 0. Idempotency check: if idem_key provided, check for existing task
    const idemKey = params.idem_key as string | undefined;
    if (idemKey) {
      const existing = await prisma.idempotencyRecord.findUnique({
        where: { user_id_idem_key: { user_id: userId, idem_key: idemKey } },
      });
      if (existing?.response) {
        // Return cached response
        const cached = existing.response as Record<string, unknown>;
        return { ok: true, data: cached as Record<string, unknown> };
      }
    }

    // 1. Risk check
    const risk = await riskService.checkGenerateRisk(userId, '0.0.0.0');
    if (!risk.allow) {
      return { ok: false, code: 'RISK_BLOCKED', message: risk.reason ?? 'Risk check failed' };
    }

    // 2. Get model + calculate price
    const model = await modelService.getModelBySlug(modelSlug);
    if (!model) return { ok: false, code: 'MODEL_NOT_FOUND', message: 'Model not found' };

    const { totalCost } = await modelService.calculatePrice(model, userId, params);
    if (totalCost === null) {
      return { ok: false, code: 'INVALID_PARAMS', message: 'Invalid generation parameters' };
    }

    // 3. Freeze balance
    const freeze = await walletService.freeze(userId, '', totalCost);
    if (!freeze.ok) {
      return { ok: false, code: 'INSUFFICIENT_BALANCE', message: `可用余额不足，当前可用：¥${(freeze.availableBalance ?? 0) / 100}，需要：¥${totalCost / 100}` };
    }

    // 4. Create task
    const task = await prisma.generationTask.create({
      data: {
        id: generateId('task'),
        user_id: userId,
        model_id: model.id,
        task_type: model.type as 'IMAGE' | 'VIDEO' | 'AUDIO' | 'TTS' | 'ASR' | 'VOICE_CLONE',
        status: 'CREATED',
        idem_key: idemKey,
        input_params: params,
        cost_snapshot: totalCost,
        total_cost: totalCost,
        expired_at: new Date(Date.now() + TASK_TIMEOUT_MS),
      },
    });

    // 5. Enqueue job
    const queue = getQueueByType(model.type);
    await queue.add('process', {
      taskId: task.id,
      userId,
      modelSlug,
      modelId: model.id,
      inputParams: params,
      totalCost,
      channelId: '',
      retryCount: 0,
      createdAt: new Date().toISOString(),
    });

    // 6. Store idem response if key was provided
    if (idemKey) {
      const responseData = {
        task_id: task.id,
        status: task.status,
        total_cost: totalCost,
        stream_url: `/api/v1/tasks/${task.id}/stream`,
      };
      await prisma.idempotencyRecord.create({
        data: {
          user_id: userId,
          idem_key: idemKey,
          request_hash: hashString(JSON.stringify(params)),
          response: responseData,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      }).catch(() => {/* Non-fatal */});
    }

    // 7. Get updated balance
    const balance = await walletService.getBalance(userId);

    return {
      ok: true,
      data: {
        task_id: task.id,
        status: task.status,
        total_cost: totalCost,
        balance,
        expires_at: task.expired_at?.toISOString(),
        stream_url: `/api/v1/tasks/${task.id}/stream`,
      },
    };
  },

  async getTask(taskId: string, userId: string) {
    const task = await prisma.generationTask.findUnique({
      where: { id: taskId },
      include: { outputs: { orderBy: { sort_order: 'asc' } }, model: true },
    });

    if (!task || task.user_id !== userId) return null;

    return {
      id: task.id,
      model_slug: task.model.slug,
      task_type: task.task_type,
      status: task.status,
      input_params: task.input_params,
      total_cost: Number(task.total_cost),
      outputs: task.outputs.map(o => ({
        id: o.id,
        url: o.file_url,
        thumbnail_url: o.thumbnail_url,
        width: o.width,
        height: o.height,
        duration: o.duration,
        mime_type: o.mime_type,
      })),
      created_at: task.created_at.toISOString(),
      completed_at: task.completed_at?.toISOString(),
    };
  },

  async listTasks(userId: string, opts: { type?: string; status?: string; page?: number; page_size?: number }) {
    const page = opts.page ?? 1;
    const pageSize = opts.page_size ?? 20;

    const where = {
      user_id: userId,
      ...(opts.type && { task_type: opts.type as any }),
      ...(opts.status && { status: opts.status as any }),
    };

    const [total, tasks] = await Promise.all([
      prisma.generationTask.count({ where }),
      prisma.generationTask.findMany({
        where,
        include: { model: true, outputs: { take: 1 } },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      tasks: tasks.map(t => ({
        id: t.id,
        model_slug: t.model.slug,
        task_type: t.task_type,
        status: t.status,
        total_cost: Number(t.total_cost),
        thumbnail: t.outputs[0]?.thumbnail_url ?? t.outputs[0]?.file_url,
        created_at: t.created_at.toISOString(),
      })),
      pagination: { total, page, page_size: pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async cancelTask(taskId: string, userId: string): Promise<{ ok: false; code: string; message: string } | { ok: true; message: string }> {
    const task = await prisma.generationTask.findUnique({ where: { id: taskId } });
    if (!task || task.user_id !== userId) {
      return { ok: false, code: 'TASK_NOT_FOUND', message: 'Task not found' };
    }
    if (task.status !== 'CREATED') {
      return { ok: false, code: 'CANNOT_CANCEL', message: 'Only CREATED tasks can be cancelled' };
    }

    await walletService.refund(userId, taskId, Number(task.total_cost), '用户取消');
    await prisma.generationTask.update({ where: { id: taskId }, data: { status: 'CANCELLED' } });

    return { ok: true, message: `任务已取消，¥${Number(task.total_cost) / 100} 已退还` };
  },

  /**
   * SSE stream for real-time task updates via Redis PubSub.
   * Falls back to polling for dev environments without Redis.
   */
  async createSSEStream(taskId: string, userId: string, req: FastifyRequest, reply: FastifyReply) {
    // 1. Verify task ownership
    const task = await prisma.generationTask.findUnique({ where: { id: taskId } });
    if (!task || task.user_id !== userId) {
      reply.raw.writeHead(404, { 'Content-Type': 'application/json' });
      reply.raw.end(JSON.stringify({ ok: false, code: 'TASK_NOT_FOUND', message: 'Task not found' }));
      return;
    }

    // 2. If already terminal, return final state immediately
    if (task.status === 'SUCCEEDED' || task.status === 'FAILED') {
      const outputs = await prisma.generationOutput.findMany({
        where: { task_id: taskId },
        orderBy: { sort_order: 'asc' },
      });
      const eventName = task.status === 'SUCCEEDED' ? 'task_completed' : 'task_failed';
      const eventData = task.status === 'SUCCEEDED'
        ? { task_id: taskId, outputs: outputs.map(o => ({ url: o.file_url, thumbnail_url: o.thumbnail_url, width: o.width, height: o.height, duration: o.duration })) }
        : { task_id: taskId, error: 'Task failed', refunded: task.status === 'FAILED' };

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      reply.raw.write(`event: ${eventName}\ndata: ${JSON.stringify(eventData)}\n\n`);
      reply.raw.end();
      return;
    }

    // 3. Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const redis = await getRedis();

    if (!redis) {
      // Dev fallback: polling
      return this._sseFallback(taskId, reply);
    }

    // 4. Subscribe to Redis PubSub channel for this task
    const channel = `task:${taskId}`;
    const subscriber = redis.duplicate();

    subscriber.on('error', () => { /* ignore */ });

    let lastActivity = Date.now();
    let closed = false;

    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      clearTimeout(timeout);
      subscriber.unsubscribe().catch(() => {});
      subscriber.quit().catch(() => {});
    };

    const sendEvent = (eventName: string, data: unknown) => {
      if (closed) return;
      try {
        reply.raw.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
        lastActivity = Date.now();
      } catch {
        cleanup();
      }
    };

    // Subscribe and handle messages
    await subscriber.subscribe(channel).catch(() => {});
    subscriber.on('message', (ch: string, msg: string) => {
      if (ch !== channel) return;
      try {
        const { event, data } = JSON.parse(msg);
        sendEvent(event, data);
        if (event === 'task_completed' || event === 'task_failed') {
          cleanup();
        }
      } catch {
        // ignore parse errors
      }
    });

    // Heartbeat: keep-alive every 30s
    const heartbeat = setInterval(() => {
      if (closed) return;
      try {
        reply.raw.write(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
      } catch {
        cleanup();
      }
    }, SSE_HEARTBEAT_MS);

    // 60s inactivity timeout → close connection
    const timeout = setTimeout(() => {
      cleanup();
      reply.raw.end();
    }, 60_000);

    // Connection close cleanup
    req.raw.on('close', cleanup);
    req.raw.on('error', cleanup);
  },

  /**
   * Dev fallback: poll DB every 2s for task status (when Redis unavailable).
   */
  async _sseFallback(taskId: string, reply: FastifyReply) {
    const poll = setInterval(async () => {
      try {
        const task = await prisma.generationTask.findUnique({ where: { id: taskId } });
        if (!task) {
          clearInterval(poll);
          reply.raw.write(`event: task_failed\ndata: ${JSON.stringify({ task_id: taskId, error: 'Task not found' })}\n\n`);
          reply.raw.end();
          return;
        }
        if (task.status === 'SUCCEEDED' || task.status === 'FAILED') {
          clearInterval(poll);
          const outputs = await prisma.generationOutput.findMany({
            where: { task_id: taskId },
            orderBy: { sort_order: 'asc' },
          });
          const eventName = task.status === 'SUCCEEDED' ? 'task_completed' : 'task_failed';
          const eventData = task.status === 'SUCCEEDED'
            ? { task_id: taskId, outputs: outputs.map(o => ({ url: o.file_url, thumbnail_url: o.thumbnail_url })) }
            : { task_id: taskId, error: 'Task failed', refunded: true };
          reply.raw.write(`event: ${eventName}\ndata: ${JSON.stringify(eventData)}\n\n`);
          reply.raw.end();
          return;
        }
        reply.raw.write(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
      } catch {
        clearInterval(poll);
        reply.raw.end();
      }
    }, 2000);
  },
};

/**
 * Publish SSE event to a task channel (called by workers).
 */
export async function emitSSEEvent(taskId: string, event: string, data: Record<string, unknown>) {
  const redis = await getRedis();
  if (!redis) return;
  try {
    await redis.publish(`task:${taskId}`, JSON.stringify({ event, data }));
  } catch {
    // Non-fatal
  }
}
