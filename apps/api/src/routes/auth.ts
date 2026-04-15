import { FastifyInstance } from 'fastify';
import { authService } from '../services/auth.service.js';

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/v1/auth/send-code
  fastify.post('/send-code', async (req, reply) => {
    const { phone } = req.body as { phone: string };
    const result = await authService.sendCode(phone);
    if (!result.ok) {
      return reply.code(400).send({ ok: false, code: 'SEND_CODE_FAILED', message: result.reason, requestId: req.requestId });
    }
    return reply.send({ ok: true, expires_in: 300 });
  });

  // POST /api/v1/auth/login-by-code
  fastify.post('/login-by-code', async (req, reply) => {
    const { phone, code } = req.body as { phone: string; code: string };
    const result = await authService.loginByCode(phone, code, req.requestId);
    if (!result.ok) {
      const status = result.reason === 'INVALID_CODE' ? 401 : 400;
      return reply.code(status).send({ ok: false, code: result.reason, message: result.message, requestId: req.requestId });
    }
    return reply.send(result);
  });

  // POST /api/v1/auth/refresh
  fastify.post('/refresh', async (req, reply) => {
    const { refresh_token } = req.body as { refresh_token: string };
    const result = await authService.refreshToken(refresh_token);
    if (!result.ok) {
      return reply.code(401).send({ ok: false, code: 'REFRESH_FAILED', message: result.message, requestId: req.requestId });
    }
    return reply.send(result);
  });

  // POST /api/v1/auth/google
  fastify.post('/google', async (req, reply) => {
    const { id_token } = req.body as { id_token: string };
    const result = await authService.loginByGoogle(id_token, req.requestId);
    if (!result.ok) {
      return reply.code(400).send({ ok: false, code: 'GOOGLE_LOGIN_FAILED', message: result.message, requestId: req.requestId });
    }
    return reply.send(result);
  });
}
