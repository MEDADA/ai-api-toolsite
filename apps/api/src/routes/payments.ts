import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { rechargeService } from '../services/recharge.service.js';
import { authenticate } from '../plugins/auth.js';
import { fail } from '../lib/api-envelope.js';

export async function paymentRoutes(fastify: FastifyInstance) {

  // ── POST /api/v1/payments/alipay/notify ─────────────────────────
  // No auth (verified by RSA signature)
  fastify.post('/alipay/notify', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = req.body as Record<string, string>;
    try {
      const success = await rechargeService.handleAlipayCallback(params);
      if (success) {
        return reply.send({ code: 'success', msg: '成功' });
      }
    } catch (err) {
      fastify.log.error('[Alipay] Callback error:', err);
    }
    return reply.send({ code: 'fail', msg: '处理失败' });
  });

  // ── POST /api/v1/payments/wechat/notify ──────────────────────────
  // No auth (verified by sign)
  fastify.post('/wechat/notify', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = req.body as Record<string, string>;
    try {
      const success = await rechargeService.handleWechatCallback(params);
      if (success) {
        return reply.header('Content-Type', 'application/xml')
          .send('<xml><code><![CDATA[SUCCESS]]></code><message><![CDATA[OK]]></message></xml>');
      }
    } catch (err) {
      fastify.log.error('[WeChat] Callback error:', err);
    }
    return reply.header('Content-Type', 'application/xml')
      .send('<xml><code><![CDATA[FAIL]]></code></xml>');
  });

  // ── POST /api/v1/payments/alipay/cancel ──────────────────────────
  // Auth required
  fastify.post('/alipay/cancel', {
    preHandler: authenticate,
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { order_id } = (req.body ?? {}) as { order_id?: string };
    if (!order_id) {
      return reply.code(400).send(fail('MISSING_PARAM', 'order_id is required', req.requestId));
    }
    const result = await rechargeService.cancelOrder(order_id, req.userId!);
    if (!result.ok) {
      return reply.code(400).send(fail(result.code ?? 'CANCEL_FAILED', result.message ?? 'Failed to cancel order', req.requestId));
    }
    return reply.send({ ok: true });
  });
}
