import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { jwtVerify } from 'jose';
import { env } from '../config/env.js';
import { fail } from '../lib/api-envelope.js';

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
    userJti?: string;
  }
}

export async function authPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('userId', '');
  fastify.decorateRequest('userLevel', '');
  fastify.decorateRequest('userJti', '');
}

/**
 * Middleware: require valid JWT access token.
 * Sets req.userId / req.userLevel / req.userJti on success.
 */
export async function authenticate(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send(fail('UNAUTHORIZED', 'Missing Authorization header', req.requestId));
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, JWT_ACCESS_SECRET);
    const decoded = payload as AccessTokenPayload;

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    // Check Redis blacklist for revoked tokens
    const redis = (fastify as FastifyInstance & { redis?: { get: (k: string) => Promise<string | null> } }).redis;
    if (redis) {
      const blacklisted = await redis.get(`auth:blacklist:${decoded.jti}`);
      if (blacklisted) {
        return reply.code(401).send(fail('TOKEN_REVOKED', 'Token has been revoked', req.requestId));
      }
    }

    req.userId = decoded.userId;
    req.userLevel = decoded.level;
    req.userJti = decoded.jti;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid token';
    return reply.code(401).send(fail('INVALID_TOKEN', msg, req.requestId));
  }
}
