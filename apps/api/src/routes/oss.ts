import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../plugins/auth.js';
import { ossService } from '../services/oss.service.js';
import { success } from '../lib/api-envelope.js';

export async function ossRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // POST /api/v1/oss/upload-token
  fastify.post('/upload-token', async (req: FastifyRequest, reply: FastifyReply) => {
    const { type } = req.body as { type: 'UPLOAD' | 'RESULT' | 'THUMBNAIL' };
    const token = await ossService.generateStsToken(req.userId!, type);
    return reply.send(success(token, req.requestId));
  });
}
