import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { requestContextPlugin } from './plugins/request-context.js';
import { redisPlugin } from './plugins/redis.js';
import { authPlugin } from './plugins/auth.js';
import { registerRoutes } from './routes/index.js';

async function main() {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // Plugins
  await fastify.register(cors, {
    origin: env.CORS_ORIGINS.split(',').map(s => s.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  await fastify.register(requestContextPlugin);
  await fastify.register(redisPlugin);
  await fastify.register(authPlugin);

  // Global error handler
  fastify.setErrorHandler((error, req, reply) => {
    fastify.log.error(error);

    if (error.validation) {
      return reply.code(400).send({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: error.message,
        requestId: req.requestId,
      });
    }

    return reply.code(500).send({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      requestId: req.requestId,
    });
  });

  // Register all routes
  await registerRoutes(fastify);

  // Start
  try {
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
    fastify.log.info(`🚀 API server running on http://0.0.0.0:${env.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
