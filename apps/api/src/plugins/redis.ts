import Redis from 'ioredis';
import { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    db: env.REDIS_DB,
    lazyConnect: true,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

export async function redisPlugin(fastify: FastifyInstance) {
  try {
    await redis.connect();
    fastify.log.info('Redis connected');
  } catch (err) {
    fastify.log.warn('Redis connection failed, some features may not work:', err);
  }

  fastify.addHook('onClose', async () => {
    await redis.quit();
  });

  fastify.decorate('redis', redis);
}

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}
