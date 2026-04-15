import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../plugins/auth.js';
import { rechargeService } from '../services/recharge.service.js';
import { success } from '../lib/api-envelope.js';

export async function rechargeRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // POST /api/v1/user/recharge
  fastify.post('/', async (req: FastifyRequest, reply: FastifyReply) => {
    const { amount, pay_method } = req.body as { amount: number; pay_method: string };
    const result = await rechargeService.createOrder(req.userId!, amount, pay_method, req.requestId);
    if (!result.ok) {
      return reply.code(400).send({ ok: false, code: result.code, message: result.message, requestId: req.requestId });
    }
    return reply.send(success(result.data, req.requestId));
  });

  // GET /api/v1/user/recharges
  fastify.get('/', async (req: FastifyRequest, reply: FastifyReply) => {
    const orders = await rechargeService.listOrders(req.userId!);
    return reply.send(success({ orders }, req.requestId));
  });
}
