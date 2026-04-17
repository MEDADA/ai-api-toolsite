import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../services/auth.service.js';
import { SendCodeSchema, LoginByCodeSchema, RefreshTokenSchema, RegisterByPhoneSchema, LoginByPasswordSchema } from '@ai-toolsite/shared';
import { success, fail } from '../lib/api-envelope.js';
import { jwtVerify } from 'jose';
import { env } from '../config/env.js';

export async function authRoutes(fastify: FastifyInstance) {

  // ── POST /api/v1/auth/send-code ──────────────────────────────────
  fastify.post('/send-code', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = SendCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send(fail('VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Invalid params', req.requestId));
    }
    const { phone } = parsed.data;
    const result = await authService.sendCode(phone);
    if (!result.ok) {
      return reply.code(400).send(fail('SEND_CODE_FAILED', result.reason ?? 'Failed to send code', req.requestId));
    }
    // In dev mode, return the code so testers don't need SMS
    if (result.code && env.NODE_ENV === 'development') {
      return reply.send({ ok: true, expires_in: 300, _dev_code: result.code });
    }
    return reply.send({ ok: true, expires_in: 300 });
  });

  // ── POST /api/v1/auth/login-by-code ─────────────────────────────
  fastify.post('/login-by-code', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = LoginByCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send(fail('VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Invalid params', req.requestId));
    }
    const { phone, code } = parsed.data;
    const result = await authService.loginByCode(phone, code, req.requestId);
    if (!result.ok) {
      const status = result.reason === 'INVALID_CODE' ? 401 : 400;
      return reply.code(status).send(fail(result.reason ?? 'LOGIN_FAILED', result.message ?? 'Login failed', req.requestId));
    }
    return reply.send(result);
  });

  // ── POST /api/v1/auth/register-by-phone ────────────────────────
  fastify.post('/register-by-phone', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = RegisterByPhoneSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send(fail('VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Invalid params', req.requestId));
    }
    const { phone, code, password } = parsed.data;
    const result = await authService.registerByPhone(phone, password, code);
    if (!result.ok) {
      const status = result.reason === 'INVALID_CODE' ? 401 : 400;
      return reply.code(status).send(fail(result.reason ?? 'REGISTER_FAILED', result.message ?? 'Registration failed', req.requestId));
    }
    return reply.send(result);
  });

  // ── POST /api/v1/auth/login-by-password ─────────────────────────
  fastify.post('/login-by-password', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = LoginByPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send(fail('VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Invalid params', req.requestId));
    }
    const { phone, password } = parsed.data;
    const result = await authService.loginByPassword(phone, password);
    if (!result.ok) {
      const status = result.reason === 'PHONE_NOT_FOUND' || result.reason === 'INVALID_PASSWORD' ? 401 : 400;
      return reply.code(status).send(fail(result.reason ?? 'LOGIN_FAILED', result.message ?? 'Login failed', req.requestId));
    }
    return reply.send(result);
  });

  // ── POST /api/v1/auth/refresh ────────────────────────────────────
  fastify.post('/refresh', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = RefreshTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send(fail('VALIDATION_ERROR', 'refresh_token is required', req.requestId));
    }
    const result = await authService.refreshToken(parsed.data.refresh_token);
    if (!result.ok) {
      return reply.code(401).send(fail('REFRESH_FAILED', result.message ?? 'Token refresh failed', req.requestId));
    }
    return reply.send(result);
  });

  // ── POST /api/v1/auth/test-login (dev only) ─────────────────────
  if (env.NODE_ENV === 'development') {
    fastify.post('/test-login', async (req: FastifyRequest, reply: FastifyReply) => {
      const result = await authService.testLogin(req.requestId);
      return reply.send(result);
    });
  }

  // ── POST /api/v1/auth/logout ─────────────────────────────────────
  fastify.post('/logout', async (req: FastifyRequest, reply: FastifyReply) => {
    const authHeader = req.headers.authorization ?? '';
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    let accessJti = '';
    let userId = '';

    // Decode access token to get jti and userId (no full verification needed for logout)
    if (accessToken) {
      try {
        const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(env.JWT_SECRET));
        const p = payload as { userId: string; jti: string };
        accessJti = p.jti;
        userId = p.userId;
      } catch {
        // Invalid token — nothing to revoke
      }
    }

    // Optional refresh token in body
    const { refresh_token } = (req.body ?? {}) as { refresh_token?: string };
    let refreshJti = '';
    if (refresh_token) {
      try {
        const { payload } = await jwtVerify(refresh_token, new TextEncoder().encode(env.JWT_REFRESH_SECRET));
        const p = payload as { jti: string };
        refreshJti = p.jti;
      } catch {
        // Ignore invalid refresh token
      }
    }

    if (userId) {
      await authService.logout(userId, accessJti, refreshJti);
    }

    return reply.send({ ok: true });
  });

  // ── POST /api/v1/auth/google ─────────────────────────────────────
  fastify.post('/google', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id_token } = (req.body ?? {}) as { id_token?: string };
    if (!id_token) {
      return reply.code(400).send(fail('MISSING_PARAM', 'id_token is required', req.requestId));
    }
    const result = await authService.loginByGoogle(id_token, req.requestId);
    if (!result.ok) {
      return reply.code(400).send(fail(result.reason ?? 'GOOGLE_LOGIN_FAILED', result.message ?? 'Google login failed', req.requestId));
    }
    return reply.send(result);
  });
}
