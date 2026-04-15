import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@ai-toolsite/db';
import { walletService } from './wallet.service.js';
import { riskService } from './risk.service.js';
import { modelService } from './model.service.js';
import { generateId } from '../lib/id.js';
import { getQueueByType } from '../queues/index.js';

export const taskService = {
  async createTask(
    userId: string,
    params: Record<string, unknown>,
    requestId: string
  ): Promise<{ ok: false; code: string; message: string } | { ok: true; data: Record<string, unknown> }> {
    // 1. Risk check
    const risk = await riskService.checkGenerateRisk(userId, '0.0.0.0');
    if (!risk.allow) {
      return { ok: false, code: 'RISK_BLOCKED', message: risk.reason ?? 'Risk check failed' };
    }

    const modelSlug = params.model_slug as string;

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
      return { ok: false, code: 'INSUFFICIENT_BALANCE', message: `可用余额不足，当前可用：¥${freeze.availableBalance}，需要：¥${totalCost / 100}` };
    }

    // 4. Create task
    const task = await prisma.generationTask.create({
      data: {
        id: generateId('task'),
        user_id: userId,
        model_id: model.id,
        task_type: model.type as any,
        status: 'CREATED',
        idem_key: params.idem_key as string | undefined,
        input_params: params,
        cost_snapshot: totalCost,
        total_cost: totalCost,
        expired_at: new Date(Date.now() + 5 * 60 * 1000),
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

    // 6. Get updated balance
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
        include: { outputs: { take: 1 } },
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

  async createSSEStream(taskId: string, userId: string, req: FastifyRequest, reply: FastifyReply) {
    // TODO: Implement SSE with Redis PubSub
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    reply.raw.write(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
  },
};
