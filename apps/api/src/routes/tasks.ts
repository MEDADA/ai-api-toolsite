import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../plugins/auth.js';
import { taskService } from '../services/task.service.js';
import { success } from '../lib/api-envelope.js';

export async function taskRoutes(fastify: FastifyInstance) {
  // Apply auth to all routes in this plugin
  fastify.addHook('preHandler', authenticate);

  // POST /api/v1/tasks/generate
  fastify.post('/generate', async (req: FastifyRequest, reply: FastifyReply) => {
    const result = await taskService.createTask(req.userId!, req.body as Record<string, unknown>, req.requestId);
    if (!result.ok) {
      const status = result.code === 'INSUFFICIENT_BALANCE' ? 422 : 400;
      return reply.code(status).send({ ok: false, code: result.code, message: result.message, requestId: req.requestId });
    }
    return reply.send(success(result.data, req.requestId));
  });

  // GET /api/v1/tasks
  fastify.get('/', async (req: FastifyRequest, reply: FastifyReply) => {
    const { type, status, page, page_size } = req.query as {
      type?: string; status?: string; page?: number; page_size?: number;
    };
    const result = await taskService.listTasks(req.userId!, { type, status, page, page_size });
    return reply.send(success(result, req.requestId));
  });

  // GET /api/v1/tasks/:task_id
  fastify.get('/:task_id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { task_id } = req.params as { task_id: string };
    const result = await taskService.getTask(task_id, req.userId!);
    if (!result) {
      return reply.code(404).send({ ok: false, code: 'TASK_NOT_FOUND', message: 'Task not found', requestId: req.requestId });
    }
    return reply.send(success(result, req.requestId));
  });

  // GET /api/v1/tasks/:task_id/stream (SSE)
  fastify.get('/:task_id/stream', async (req: FastifyRequest, reply: FastifyReply) => {
    const { task_id } = req.params as { task_id: string };
    return taskService.createSSEStream(task_id, req.userId!, req, reply);
  });

  // DELETE /api/v1/tasks/:task_id
  fastify.delete('/:task_id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { task_id } = req.params as { task_id: string };
    const result = await taskService.cancelTask(task_id, req.userId!);
    if (!result.ok) {
      const status = result.code === 'TASK_NOT_FOUND' ? 404 : 400;
      return reply.code(status).send({ ok: false, code: result.code, message: result.message, requestId: req.requestId });
    }
    return reply.send(success({ message: result.message }, req.requestId));
  });
}
