import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateRequestId } from '../lib/id.js';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
    userId?: string;
    userLevel?: string;
  }
  interface FastifyReply {
    requestId: string;
  }
}

export async function requestContextPlugin(fastify: FastifyInstance) {
  // Add request ID to every request
  fastify.addHook('onRequest', async (req: FastifyRequest) => {
    const id = (req.headers['x-request-id'] as string) || generateRequestId();
    req.requestId = id;
  });

  // Inject request ID into reply headers
  fastify.addHook('onSend', async (req: FastifyRequest, reply: FastifyReply) => {
    reply.requestId = req.requestId;
    reply.header('X-Request-Id', req.requestId);
  });
}
