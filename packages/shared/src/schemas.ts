import { z } from 'zod';

// ============================================================
// Auth Schemas
// ============================================================

export const SendCodeSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, 'Invalid Chinese mobile number'),
});

export const LoginByCodeSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/),
  code: z.string().length(6, 'Code must be 6 digits'),
});

export const RegisterByPhoneSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/),
  code: z.string().length(6, 'Code must be 6 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const LoginByPasswordSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refresh_token: z.string().min(1),
});

export const GoogleLoginSchema = z.object({
  id_token: z.string().min(1),
});

export const AppleLoginSchema = z.object({
  identity_token: z.string().min(1),
  authorization_code: z.string().min(1),
});

// ============================================================
// Task Schemas
// ============================================================

export const ImageParamsSchema = z.object({
  prompt: z.string().min(1).max(2000),
  reference_image_url: z.string().url().optional(),
  width: z.enum(['512', '1024', '1080']).default('1024'),
  height: z.enum(['512', '1024', '1920']).default('1024'),
  style: z.string().optional(),
  num_inference_steps: z.enum(['fast', 'standard', 'high']).default('standard'),
  image_count: z.number().int().min(1).max(4).default(1),
  strength: z.number().min(0).max(1).default(0.7),
});

export const VideoParamsSchema = z.object({
  prompt: z.string().min(1).max(500),
  duration: z.union([z.literal(3), z.literal(5), z.literal(10), z.literal(15)]).default(5),
  resolution: z.enum(['540p', '720p', '1080p', '4K']).default('1080p'),
  reference_image_url: z.string().url().optional(),
  fps: z.number().optional().default(24),
  camera_control: z.record(z.unknown()).optional(),
});

export const TTSParamsSchema = z.object({
  text: z.string().min(1).max(5000),
  voice: z.enum(['female_young', 'female_mature', 'male_young', 'male_mature', 'child']).default('female_young'),
  speed: z.number().min(0.5).max(2.0).default(1.0),
  volume: z.number().min(0).max(100).default(80),
});

export const ASRParamsSchema = z.object({
  audio_url: z.string().url(),
  language: z.enum(['auto', 'zh', 'en']).default('auto'),
});

export const VoiceCloneParamsSchema = z.object({
  source_audio_url: z.string().url(),
  target_text: z.string().min(1).max(500),
});

export const CreateTaskSchema = z.object({
  model_slug: z.string().min(1),
  idem_key: z.string().optional(),
  ...ImageParamsSchema.shape,
  ...VideoParamsSchema.shape,
  ...TTSParamsSchema.shape,
  ...ASRParamsSchema.shape,
  ...VoiceCloneParamsSchema.shape,
}).passthrough();

export const GetTasksQuerySchema = z.object({
  type: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'TTS', 'ASR', 'VOICE_CLONE']).optional(),
  status: z.enum(['CREATED', 'QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================
// Wallet Schemas
// ============================================================

export const WalletLedgerQuerySchema = z.object({
  tx_type: z.enum(['RECHARGE', 'GIFT_CREDIT', 'TASK_FREEZE', 'TASK_SETTLE', 'TASK_REFUND', 'MEMBERSHIP_PURCHASE', 'MANUAL_ADJUSTMENT']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export const RechargeCreateSchema = z.object({
  amount: z.number().refine((n) => [10, 50, 100, 500, 1000].includes(n), {
    message: 'Amount must be one of: 10, 50, 100, 500, 1000',
  }),
  pay_method: z.enum(['alipay', 'wechat', 'stripe', 'paypal']),
});

// ============================================================
// OSS Schemas
// ============================================================

export const OssUploadTokenSchema = z.object({
  type: z.enum(['UPLOAD', 'RESULT', 'THUMBNAIL']),
});

// ============================================================
// Favorite Schemas
// ============================================================

export const CreateFavoriteSchema = z.object({
  task_id: z.string().min(1),
});

export const DeleteFavoriteSchema = z.object({
  id: z.string().min(1),
});

// ============================================================
// Pagination
// ============================================================

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================
// Common
// ============================================================

export const TaskIdSchema = z.object({
  task_id: z.string().min(1),
});

export const FavoriteIdSchema = z.object({
  id: z.string().min(1),
});

// Type exports
export type SendCodeInput = z.infer<typeof SendCodeSchema>;
export type LoginByCodeInput = z.infer<typeof LoginByCodeSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type RechargeCreateInput = z.infer<typeof RechargeCreateSchema>;
