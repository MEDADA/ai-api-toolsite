import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { prisma } from '@ai-toolsite/db';
import { env } from '../config/env.js';
import { generateId } from '../lib/id.js';
import { GIFT_CREDIT_AMOUNT } from '@ai-toolsite/shared';

const ACCESS_SECRET = new TextEncoder().encode(env.JWT_SECRET);
const REFRESH_SECRET = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

// In-memory dev codes fallback (when Redis unavailable)
const devCodeStore = new Map<string, { code: string; expiresAt: number }>();

/** Redis key helpers */
const codeKey = (phone: string) => `auth:code:${phone}`;
const blacklistKey = (jti: string) => `auth:blacklist:${jti}`;
const refreshKey = (jti: string) => `auth:refresh:${jti}`;

interface ServiceResult<T = unknown> {
  ok: boolean;
  reason?: string;
  message?: string;
  data?: T;
}

function maskPhone(phone: string): string {
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

/** Import redis lazily to avoid circular deps */
async function getRedis() {
  try {
    const { redis } = await import('../plugins/redis.js');
    return redis;
  } catch {
    return null;
  }
}

/** Generate a 6-digit code */
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const authService = {
  /**
   * Send verification code to phone.
   * Dev mode: code returned in response or logged.
   */
  async sendCode(phone: string): Promise<{ ok: boolean; reason?: string; code?: string }> {
    const code = generateCode();
    const ttlSeconds = 300; // 5 minutes

    const redis = await getRedis();

    if (redis) {
      // Store code with 5-min TTL, overwriting any previous code
      const key = codeKey(phone);
      await redis.set(key, JSON.stringify({ code, expiresAt: Date.now() + ttlSeconds * 1000 }), 'EX', ttlSeconds);
    } else {
      // Fallback: in-memory store (dev only)
      devCodeStore.set(phone, { code, expiresAt: Date.now() + ttlSeconds * 1000 });
    }

    if (env.NODE_ENV === 'development') {
      console.log(`[Auth] Dev mode — code for ${phone}: ${code}`);
      return { ok: true, code }; // Return code in dev for easy testing
    }

    // TODO: Integrate real SMS provider (aliyun/tencent)
    console.log(`[Auth] Send code to ${phone} — SMS integration pending`);
    return { ok: true };
  },

  /**
   * Verify code + login (create user on first login, issue tokens).
   */
  async loginByCode(
    phone: string,
    code: string,
    requestId: string
  ): Promise<ServiceResult & {
    first_login?: boolean;
    user?: Record<string, unknown>;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  }> {
    // 1. Verify code
    const verified = await this.verifyCode(phone, code);
    if (!verified) {
      return { ok: false, reason: 'INVALID_CODE', message: '验证码错误或已过期' };
    }

    // 2. Find or create user
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

      // Issue gift credit (5元 = 500分)
      if (user.wallet) {
        await prisma.walletAccount.update({
          where: { user_id: user.id },
          data: {
            available_balance: { increment: GIFT_CREDIT_AMOUNT },
            total_recharged: { increment: GIFT_CREDIT_AMOUNT },
          },
        });
        await prisma.walletLedger.create({
          data: {
            wallet_id: user.wallet.id,
            user_id: user.id,
            tx_type: 'GIFT_CREDIT',
            amount: GIFT_CREDIT_AMOUNT,
            balance_before: 0,
            balance_after: GIFT_CREDIT_AMOUNT,
            remark: '注册赠送5元体验金',
          },
        });
        await prisma.user.update({ where: { id: user.id }, data: { gift_credit: true } });
      }
    } else {
      // Update last login
      await prisma.user.update({ where: { id: user.id }, data: { updated_at: new Date() } });
    }

    // 3. Generate tokens
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
      expires_in: 2592000,
    };
  },

  /** Dev test login — creates or uses a test user, returns real JWT */
  async testLogin(requestId: string): Promise<ServiceResult & {
    first_login?: boolean;
    user?: Record<string, unknown>;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  }> {
    const testPhone = '13800000000';
    let user = await prisma.user.findUnique({ where: { phone: testPhone } });
    let firstLogin = false;

    if (!user) {
      firstLogin = true;
      user = await prisma.user.create({
        data: {
          phone: testPhone,
          nickname: '测试用户',
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
      // Issue gift credit (5元 = 500分)
      if (user.wallet) {
        await prisma.walletAccount.update({
          where: { user_id: user.id },
          data: {
            available_balance: { increment: GIFT_CREDIT_AMOUNT },
            total_recharged: { increment: GIFT_CREDIT_AMOUNT },
          },
        });
        await prisma.walletLedger.create({
          data: {
            wallet_id: user.wallet.id,
            user_id: user.id,
            tx_type: 'GIFT_CREDIT',
            amount: GIFT_CREDIT_AMOUNT,
            balance_before: 0,
            balance_after: GIFT_CREDIT_AMOUNT,
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
        phone: maskPhone(testPhone),
        level: user.level,
        gift_credit: user.gift_credit,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 2592000,
    };
  },

  /**
   * Register a new user with phone + password (password set after code verification).
   */
  async registerByPhone(
    phone: string,
    password: string,
    code: string
  ): Promise<ServiceResult & { user_id: string }> {
    // 1. Verify code
    const verified = await this.verifyCode(phone, code);
    if (!verified) {
      return { ok: false, reason: 'INVALID_CODE', message: '验证码错误或已过期' };
    }

    // 2. Check if phone already registered
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return { ok: false, reason: 'PHONE_REGISTERED', message: '该手机号已注册，请直接登录' };
    }

    // 3. Hash password and create user
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        phone,
        phone_password_hash: passwordHash,
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

    // 4. Issue gift credit (5元 = 500分)
    if (user.wallet) {
      await prisma.walletAccount.update({
        where: { user_id: user.id },
        data: {
          available_balance: { increment: GIFT_CREDIT_AMOUNT },
          total_recharged: { increment: GIFT_CREDIT_AMOUNT },
        },
      });
      await prisma.walletLedger.create({
        data: {
          wallet_id: user.wallet.id,
          user_id: user.id,
          tx_type: 'GIFT_CREDIT',
          amount: GIFT_CREDIT_AMOUNT,
          balance_before: 0,
          balance_after: GIFT_CREDIT_AMOUNT,
          remark: '注册赠送5元体验金',
        },
      });
      await prisma.user.update({ where: { id: user.id }, data: { gift_credit: true } });
    }

    return { ok: true, user_id: user.id };
  },

  /**
   * Login with phone + password.
   */
  async loginByPassword(
    phone: string,
    password: string
  ): Promise<ServiceResult & {
    user?: Record<string, unknown>;
    access_token?: string;
    refresh_token?: { token: string; jti: string };
    expires_in?: number;
  }> {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return { ok: false, reason: 'PHONE_NOT_FOUND', message: '该手机号未注册，请先注册' };
    }

    if (!user.phone_password_hash) {
      return { ok: false, reason: 'NO_PASSWORD_SET', message: '该账号未设置密码，请使用验证码登录' };
    }

    const valid = await bcrypt.compare(password, user.phone_password_hash);
    if (!valid) {
      return { ok: false, reason: 'INVALID_PASSWORD', message: '密码错误' };
    }

    // Update last login
    await prisma.user.update({ where: { id: user.id }, data: { updated_at: new Date() } });

    // Generate tokens
    const accessToken = await signAccessToken(user.id, user.level);
    const refreshToken = await signRefreshToken(user.id);

    return {
      ok: true,
      user: {
        id: user.id,
        phone: maskPhone(phone),
        level: user.level,
        gift_credit: user.gift_credit,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 2592000,
    };
  },

  /**
   * Verify the code from Redis/in-memory store.
   */
  async verifyCode(phone: string, code: string): Promise<boolean> {
    const redis = await getRedis();

    if (redis) {
      const raw = await redis.get(codeKey(phone));
      if (!raw) return false;
      const { code: storedCode } = JSON.parse(raw);
      return storedCode === code;
    }

    // Fallback: in-memory
    const stored = devCodeStore.get(phone);
    if (!stored) return false;
    if (Date.now() > stored.expiresAt) {
      devCodeStore.delete(phone);
      return false;
    }
    return stored.code === code;
  },

  /**
   * Google OAuth login (stub — placeholder for future).
   */
  async loginByGoogle(
    idToken: string,
    _requestId: string
  ): Promise<ServiceResult & {
    first_login?: boolean;
    user?: Record<string, unknown>;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  }> {
    // TODO: Verify Google ID token with Google APIs
    // For now, return not implemented
    return { ok: false, reason: 'NOT_IMPLEMENTED', message: 'Google login not yet available' };
  },

  /**
   * Refresh access token using refresh token.
   * Refresh token is revoked after use (one-time).
   */
  async refreshToken(
    refreshToken: string
  ): Promise<ServiceResult & { access_token?: string; expires_in?: number }> {
    try {
      const { payload } = await jwtVerify(refreshToken, REFRESH_SECRET);
      const { userId, jti, type } = payload as { userId: string; jti: string; type: string };

      if (type !== 'refresh') {
        return { ok: false, reason: 'INVALID_TOKEN_TYPE', message: 'Invalid token type' };
      }

      // Check Redis: token must exist (not revoked)
      const redis = await getRedis();
      if (redis) {
        const stored = await redis.get(refreshKey(jti));
        if (!stored || stored !== userId) {
          return { ok: false, reason: 'TOKEN_REVOKED', message: 'Refresh token has been revoked' };
        }
        // Revoke immediately (use-once)
        await redis.del(refreshKey(jti));
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return { ok: false, reason: 'USER_NOT_FOUND', message: 'User not found' };

      const newAccessToken = await signAccessToken(user.id, user.level);
      return { ok: true, access_token: newAccessToken, expires_in: 2592000 };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Token invalid';
      return { ok: false, reason: 'INVALID_REFRESH_TOKEN', message: msg };
    }
  },

  /**
   * Logout: blacklist current access token + revoke refresh token.
   */
  async logout(
    userId: string,
    accessJti: string,
    refreshJti?: string
  ): Promise<void> {
    const redis = await getRedis();

    if (redis) {
      // Blacklist access token (TTL = remaining token lifetime, max 2h)
      if (accessJti) {
        await redis.set(blacklistKey(accessJti), '1', 'EX', 7200);
      }
      // Revoke refresh token immediately
      if (refreshJti) {
        await redis.del(refreshKey(refreshJti));
      }
    }

    // Also delete DB session record
    if (refreshJti) {
      await prisma.userSession.deleteMany({
        where: { user_id: userId, refresh_token: refreshJti },
      });
    }

    console.log(`[Auth] User ${userId} logged out`);
  },
};

// ─────────────────────────────────────────────────────────────
// Token signing helpers
// ─────────────────────────────────────────────────────────────

async function signAccessToken(userId: string, level: string): Promise<string> {
  const jti = generateId('tok');
  return new SignJWT({ userId, level, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .setJti(jti)
    .sign(ACCESS_SECRET);
}

async function signRefreshToken(userId: string): Promise<{ token: string; jti: string }> {
  const jti = generateId('ref');
  const token = await new SignJWT({ userId, jti, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .setJti(jti)
    .sign(REFRESH_SECRET);

  // Store in Redis with TTL=30d
  const redis = await getRedis();
  if (redis) {
    await redis.set(refreshKey(jti), userId, 'EX', 30 * 24 * 60 * 60);
  }

  // Persist to DB session table
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.userSession.create({
    data: {
      user_id: userId,
      refresh_token: jti, // Store jti, not full token
      status: 'ACTIVE',
      expires_at: expiresAt,
    },
  }).catch(() => {
    // Non-fatal if DB write fails (Redis is primary)
  });

  return { token, jti };
}

/** Internal: sign both tokens, return full result */
export async function generateTokens(userId: string, level: string) {
  const accessToken = await signAccessToken(userId, level);
  const { token: refreshToken, jti: refreshJti } = await signRefreshToken(userId);
  return { accessToken, refreshToken, refreshJti };
}

/** Internal: verify access token JTI not blacklisted */
export async function verifyAccessTokenNotBlacklisted(jti: string): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return true; // Skip blacklist check if Redis unavailable
  const exists = await redis.get(blacklistKey(jti));
  return !exists;
}
