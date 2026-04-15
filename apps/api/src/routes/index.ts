import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.js';
import { authRoutes } from './auth.js';
import { modelRoutes } from './models.js';
import { taskRoutes } from './tasks.js';
import { ossRoutes } from './oss.js';
import { userRoutes } from './user.js';
import { rechargeRoutes } from './recharge.js';
import { favoriteRoutes } from './favorites.js';
import { paymentRoutes } from './payments.js';

export async function registerRoutes(fastify: FastifyInstance) {
  // Health check (no prefix)
  await fastify.register(healthRoutes);

  // Auth routes — public
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });

  // Public model routes
  await fastify.register(modelRoutes, { prefix: '/api/v1/models' });

  // OSS upload token — needs auth
  await fastify.register(ossRoutes, { prefix: '/api/v1/oss' });

  // Task routes — needs auth
  await fastify.register(taskRoutes, { prefix: '/api/v1/tasks' });

  // User routes — needs auth
  await fastify.register(userRoutes, { prefix: '/api/v1/user' });

  // Recharge routes — needs auth
  await fastify.register(rechargeRoutes, { prefix: '/api/v1/user/recharge' });

  // Favorites — needs auth
  await fastify.register(favoriteRoutes, { prefix: '/api/v1/favorites' });

  // Payment callbacks — no auth (verify signature instead)
  await fastify.register(paymentRoutes, { prefix: '/api/v1/payments' });
}
