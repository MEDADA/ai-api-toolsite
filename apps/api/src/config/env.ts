import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  APP_URL: z.string().url().default('http://localhost:3001'),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  ADMIN_URL: z.string().url().default('http://localhost:3002'),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default('2h'),
  JWT_REFRESH_EXPIRES: z.string().default('30d'),

  // OSS
  OSS_REGION: z.string(),
  OSS_ACCESS_KEY_ID: z.string(),
  OSS_ACCESS_KEY_SECRET: z.string(),
  OSS_BUCKET: z.string(),
  OSS_STS_ROLE_ARN: z.string(),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3002'),

  // Rate Limits
  RATE_LIMIT_GENERAL: z.coerce.number().default(60),
  RATE_LIMIT_AUTH_CODE: z.coerce.number().default(5),
  RATE_LIMIT_GENERATE: z.coerce.number().default(10),

  // Upstream providers
  REPLICATE_API_TOKEN: z.string().optional(),
  BAILLIAN_API_KEY: z.string().optional(),
  VOLCENGINE_ACCESS_KEY: z.string().optional(),
  VOLCENGINE_SECRET_KEY: z.string().optional(),

  // SMS
  SMS_PROVIDER: z.enum(['aliyun', 'tencent']).default('aliyun'),
  SMS_ALIYUN_ACCESS_KEY: z.string().optional(),
  SMS_ALIYUN_SECRET: z.string().optional(),
  SMS_ALIYUN_SIGN_NAME: z.string().default('AI工具站'),
  SMS_ALIYUN_TEMPLATE_CODE: z.string().optional(),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Log
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
