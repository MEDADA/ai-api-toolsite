import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../plugins/auth.js';
import { walletService } from '../services/wallet.service.js';
import { success } from '../lib/api-envelope.js';

export async function userRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/v1/user/profile
  fastify.get('/profile', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await walletService.getUserProfile(req.userId!);
    if (!user) {
      return reply.code(404).send({ ok: false, code: 'USER_NOT_FOUND', message: 'User not found', requestId: req.requestId });
    }
    return reply.send(success(user, req.requestId));
  });

  // GET /api/v1/user/balance
  fastify.get('/balance', async (req: FastifyRequest, reply: FastifyReply) => {
    const balance = await walletService.getBalance(req.userId!);
    return reply.send(success(balance, req.requestId));
  });

  // GET /api/v1/user/wallet/ledger
  fastify.get('/wallet/ledger', async (req: FastifyRequest, reply: FastifyReply) => {
    const { tx_type, page, page_size } = req.query as {
      tx_type?: string; page?: number; page_size?: number;
    };
    const records = await walletService.getLedger(req.userId!, { tx_type, page, page_size });
    return reply.send(success(records, req.requestId));
  });

  // GET /api/v1/user/consumption
  fastify.get('/consumption', async (req: FastifyRequest, reply: FastifyReply) => {
    const { page, page_size } = req.query as { page?: number; page_size?: number };
    const records = await walletService.getConsumption(req.userId!, { page, page_size });
    return reply.send(success(records, req.requestId));
  });
}
