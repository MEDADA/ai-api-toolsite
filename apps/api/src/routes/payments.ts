import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { rechargeService } from '../services/recharge.service.js';

export async function paymentRoutes(fastify: FastifyInstance) {
  // POST /api/v1/payments/alipay/notify
  fastify.post('/alipay/notify', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = req.body as Record<string, string>;
    const result = await rechargeService.handleAlipayCallback(params);
    if (result) {
      return reply.send({ code: 'success', msg: '成功' });
    }
    return reply.code(400).send({ code: 'fail', msg: '处理失败' });
  });

  // POST /api/v1/payments/wechat/notify
  fastify.post('/wechat/notify', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = req.body as Record<string, string>;
    const result = await rechargeService.handleWechatCallback(params);
    if (result) {
      return reply.send('<xml><code><![CDATA[SUCCESS]]></code><message><![CDATA[OK]]></message></xml>');
    }
    return reply.send('<xml><code><![CDATA[FAIL]]></code></xml>');
  });
}
