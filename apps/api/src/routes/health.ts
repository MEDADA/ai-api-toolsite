import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@ai-toolsite/db';
import { success } from '../lib/api-envelope.js';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                timestamp: { type: 'string' },
                uptime: { type: 'number' },
                db: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (_req: FastifyRequest, reply: FastifyReply) => {
    let dbStatus = 'unknown';

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    return reply.send(success({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      db: dbStatus,
    }, reply.requestId));
  });
}
