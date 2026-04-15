import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { jwtVerify } from 'jose';
import { env } from '../config/env.js';

const JWT_ACCESS_SECRET = new TextEncoder().encode(env.JWT_SECRET);

interface AccessTokenPayload {
  userId: string;
  level: string;
  type: 'access';
  jti: string;
  iat: number;
  exp: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    userLevel?: string;
  }
}

export async function authPlugin(fastify: FastifyInstance) {
  // Decorate request with optional auth (doesn't enforce)
  fastify.decorateRequest('userId', '');
  fastify.decorateRequest('userLevel', '');

  // Decorate reply for convenience
  fastify.decorateReply('requestId', '');
}

export async function authenticate(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid Authorization header',
      requestId: req.requestId,
    });
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, JWT_ACCESS_SECRET);
    const decoded = payload as AccessTokenPayload;

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    req.userId = decoded.userId;
    req.userLevel = decoded.level;
  } catch {
    return reply.code(401).send({
      ok: false,
      code: 'INVALID_TOKEN',
      message: 'Token is invalid or expired',
      requestId: req.requestId,
    });
  }
}
