import { SignJWT, jwtVerify } from 'jose';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@ai-toolsite/db';
import { env } from '../config/env.js';
import { generateRequestId, hashString } from '../lib/id.js';

const ACCESS_SECRET = new TextEncoder().encode(env.JWT_SECRET);
const REFRESH_SECRET = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

interface ServiceResult<T = unknown> {
  ok: boolean;
  reason?: string;
  message?: string;
  data?: T;
}

function maskPhone(phone: string): string {
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

export const authService = {
  async sendCode(phone: string): Promise<{ ok: boolean; reason?: string }> {
    // TODO: Integrate SMS provider (aliyun/tencent)
    // TODO: Store code in Redis with 5min TTL
    console.log(`[Auth] Send code to ${phone} — TODO: integrate SMS`);
    return { ok: true };
  },

  async loginByCode(
    phone: string,
    code: string,
    requestId: string
  ): Promise<ServiceResult & { first_login?: boolean; user?: Record<string, unknown>; access_token?: string; refresh_token?: string; expires_in?: number }> {
    // TODO: Verify code from Redis
    if (code !== '123456') {
      return { ok: false, reason: 'INVALID_CODE', message: 'Invalid verification code' };
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { phone } });
    let firstLogin = false;

    if (!user) {
      firstLogin = true;
      user = await prisma.user.create({
        data: {
          phone,
          nickname: `用户${phone.slice(-4)}`,
          level: 'NORMAL',
          gift_credit: false,
          wallet: {
            create: {
              available_balance: 0,
              frozen_balance: 0,
              total_recharged: 0,
              total_spent: 0,
            },
          },
        },
        include: { wallet: true },
      });

      // Issue gift credit for first login
      if (user.wallet) {
        const GIFT_CREDIT = 500; // 5元 = 500分
        await prisma.walletAccount.update({
          where: { user_id: user.id },
          data: {
            available_balance: { increment: GIFT_CREDIT },
            total_recharged: { increment: GIFT_CREDIT },
          },
        });
        await prisma.walletLedger.create({
          data: {
            wallet_id: user.wallet.id,
            user_id: user.id,
            tx_type: 'GIFT_CREDIT',
            amount: GIFT_CREDIT,
            balance_before: 0,
            balance_after: GIFT_CREDIT,
            remark: '注册赠送5元体验金',
          },
        });
        await prisma.user.update({ where: { id: user.id }, data: { gift_credit: true } });
      }
    }

    const accessToken = await signAccessToken(user.id, user.level);
    const refreshToken = await signRefreshToken(user.id);

    return {
      ok: true,
      first_login: firstLogin,
      user: {
        id: user.id,
        phone: maskPhone(phone),
        level: user.level,
        gift_credit: user.gift_credit,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 7200,
    };
  },

  async loginByGoogle(
    idToken: string,
    requestId: string
  ): Promise<ServiceResult & { first_login?: boolean; user?: Record<string, unknown>; access_token?: string; refresh_token?: string }> {
    // TODO: Verify Google ID token
    return { ok: false, reason: 'NOT_IMPLEMENTED', message: 'Google login not yet implemented' };
  },

  async refreshToken(refreshToken: string): Promise<ServiceResult & { access_token?: string; expires_in?: number }> {
    try {
      const { payload } = await jwtVerify(refreshToken, REFRESH_SECRET);
      const { userId, jti } = payload as { userId: string; jti: string };

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return { ok: false, reason: 'USER_NOT_FOUND', message: 'User not found' };

      const newAccessToken = await signAccessToken(user.id, user.level);
      return { ok: true, access_token: newAccessToken, expires_in: 7200 };
    } catch {
      return { ok: false, reason: 'INVALID_REFRESH_TOKEN', message: 'Refresh token invalid or expired' };
    }
  },

  async logout(userId: string, accessTokenJti: string): Promise<void> {
    // TODO: Blacklist access token + revoke refresh token in Redis
    console.log(`[Auth] Logout user ${userId}, token ${accessTokenJti}`);
  },
};

async function signAccessToken(userId: string, level: string): Promise<string> {
  return new SignJWT({ userId, level, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .setJti(generateRequestId())
    .sign(ACCESS_SECRET);
}

async function signRefreshToken(userId: string): Promise<string> {
  const jti = generateRequestId();
  return new SignJWT({ userId, jti, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .setJti(jti)
    .sign(REFRESH_SECRET);
}
