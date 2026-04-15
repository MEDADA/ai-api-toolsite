// ============================================================
// Recharge Tiers
// ============================================================

export const RECHARGE_TIERS = [
  { amount: 10, gift: 0, label: '¥10' },
  { amount: 50, gift: 2, label: '¥50 (送¥2)' },
  { amount: 100, gift: 10, label: '¥100 (送¥10)' },
  { amount: 500, gift: 100, label: '¥500 (送¥100)' },
  { amount: 1000, gift: 250, label: '¥1000 (送¥250)' },
] as const;

export type RechargeTier = (typeof RECHARGE_TIERS)[number];

// ============================================================
// Model Slugs
// ============================================================

export const MODEL_SLUGS = {
  FLUX_2_SCHNELL: 'flux-2-schnell',
  FLUX_2_DEV: 'flux-2-dev',
  WANXIANG_2_6: 'wanxiang-2-6',
  SEEDANCE_2_0: 'seedance-2-0',
  SEEDANCE_1_5: 'seedance-1-5',
  KLING_3_0: 'kling-3-0',
  COSYVOICE_V3_FLASH: 'cosyvoice-v3-flash',
  FUNASR: 'funasr',
} as const;

// ============================================================
// Membership
// ============================================================

export const MEMBERSHIP = {
  MONTHLY: { level: 'MONTHLY', price: 2900, label: '月卡', discount: { IMAGE: 0.8, VIDEO: 0.9 } },
  YEARLY: { level: 'YEARLY', price: 19900, label: '年卡', discount: { IMAGE: 0.7, VIDEO: 0.8 } },
} as const;

// ============================================================
// Gift Credit
// ============================================================

export const GIFT_CREDIT_AMOUNT = 500; // 5元 = 500分

// ============================================================
// Task
// ============================================================

export const TASK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_RETRIES = 2;
export const RETRY_DELAY_MS = 10_000;
export const SSE_HEARTBEAT_MS = 30_000;
export const SSE_TIMEOUT_MS = 60_000;

// ============================================================
// Pagination
// ============================================================

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ============================================================
// OSS Directory Keys
// ============================================================

export const OSS_DIRS = {
  UPLOAD: 'uploads',
  RESULT: 'results',
  THUMBNAIL: 'thumbnails',
} as const;

// ============================================================
// Image Sizes
// ============================================================

export const IMAGE_SIZES = ['512', '1024', '1080'] as const;
export const IMAGE_HEIGHT_OPTIONS = ['512', '1024', '1920'] as const;

// ============================================================
// Video Durations
// ============================================================

export const VIDEO_DURATIONS = [3, 5, 10, 15] as const;
export const VIDEO_RESOLUTIONS = ['540p', '720p', '1080p', '4K'] as const;

// ============================================================
// Voice Options
// ============================================================

export const TTS_VOICES = [
  'female_young',
  'female_mature',
  'male_young',
  'male_mature',
  'child',
] as const;

export const TTS_SPEED_RANGE = { min: 0.5, max: 2.0, default: 1.0 } as const;
export const TTS_VOLUME_RANGE = { min: 0, max: 100, default: 80 } as const;

// ============================================================
// Rate Limits
// ============================================================

export const RATE_LIMITS = {
  GENERAL: 60,       // req/min/IP
  AUTH_CODE: 5,       // req/min/IP
  GENERATE: 10,      // req/min/User
  DAILY_GENERATE: 100,
} as const;

// ============================================================
// API Defaults
// ============================================================

export const DEFAULT_INFERENCE_STEPS = 'standard' as const;
export const DEFAULT_IMAGE_COUNT = 1;
export const DEFAULT_VIDEO_FPS = 24;
export const MAX_PROMPT_LENGTH = 2000;
export const MAX_VIDEO_PROMPT_LENGTH = 500;
export const MAX_TTS_TEXT_LENGTH = 5000;
