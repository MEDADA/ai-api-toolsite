import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { modelService } from '../services/model.service.js';
import { success } from '../lib/api-envelope.js';

export async function modelRoutes(fastify: FastifyInstance) {
  // GET /api/v1/models
  fastify.get('/', async (req: FastifyRequest, reply: FastifyReply) => {
    const type = (req.query as { type?: string }).type;
    const models = await modelService.listModels(type);
    return reply.send(success(models, req.requestId));
  });

  // GET /api/v1/models/:slug
  fastify.get('/:slug', async (req: FastifyRequest, reply: FastifyReply) => {
    const { slug } = req.params as { slug: string };
    const model = await modelService.getModelBySlug(slug);
    if (!model) {
      return reply.code(404).send({ ok: false, code: 'MODEL_NOT_FOUND', message: 'Model not found', requestId: req.requestId });
    }
    return reply.send(success(model, req.requestId));
  });
}
