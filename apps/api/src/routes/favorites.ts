import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../plugins/auth.js';
import { favoriteService } from '../services/favorite.service.js';
import { success } from '../lib/api-envelope.js';

export async function favoriteRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/v1/favorites
  fastify.get('/', async (req: FastifyRequest, reply: FastifyReply) => {
    const favorites = await favoriteService.listFavorites(req.userId!);
    return reply.send(success({ favorites }, req.requestId));
  });

  // POST /api/v1/favorites
  fastify.post('/', async (req: FastifyRequest, reply: FastifyReply) => {
    const { task_id } = req.body as { task_id: string };
    const result = await favoriteService.addFavorite(req.userId!, task_id);
    if (!result.ok) {
      return reply.code(400).send({ ok: false, code: result.code, message: result.message, requestId: req.requestId });
    }
    return reply.send(success({ favorite_id: result.favoriteId }, req.requestId));
  });

  // DELETE /api/v1/favorites/:id
  fastify.delete('/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const result = await favoriteService.removeFavorite(req.userId!, id);
    if (!result.ok) {
      return reply.code(404).send({ ok: false, code: result.code, message: result.message, requestId: req.requestId });
    }
    return reply.send(success({ message: 'Removed' }, req.requestId));
  });
}
