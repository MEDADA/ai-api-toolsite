/**
 * Web-only type stubs for @ai-toolsite/shared.
 * These are subset types used by the frontend; server types use Prisma.
 */

// ── SSE Event Types ────────────────────────────────────────
export interface SSETaskQueued {
  task_id: string;
  queued_at: string;
  position?: number;
}

export interface SSETaskStarted {
  task_id: string;
  started_at: string;
}

export interface SSEProgress {
  task_id: string;
  progress: number;
  message?: string;
}

export interface SSECompleted {
  task_id: string;
  outputs: Array<{
    url: string;
    thumbnail_url?: string;
    width?: number;
    height?: number;
    duration?: number;
  }>;
}

export interface SSEFailed {
  task_id: string;
  error: string;
  refunded: boolean;
}

// ── Auth ─────────────────────────────────────────────────
export interface LoginResult {
  ok: boolean;
  first_login: boolean;
  user: {
    id: string;
    phone?: string;
    email?: string;
    level: string;
    gift_credit: boolean;
  };
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// ── Wallet ───────────────────────────────────────────────
export interface WalletBalance {
  available: number;
  frozen: number;
  total_recharged: number;
  total_spent: number;
}

export interface WalletLedgerRecord {
  id: string;
  tx_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  order_id?: string;
  remark?: string;
  created_at: string;
}

// ── Task ─────────────────────────────────────────────────
export interface CreateTaskRequest {
  model_slug: string;
  idem_key?: string;
  prompt?: string;
  reference_image_url?: string;
  width?: string;
  height?: string;
  style?: string;
  num_inference_steps?: 'fast' | 'standard' | 'high';
  image_count?: number;
  strength?: number;
  duration?: number;
  resolution?: string;
  fps?: number;
  camera_control?: Record<string, unknown>;
  text?: string;
  voice?: string;
  speed?: number;
  volume?: number;
  source_audio_url?: string;
  target_text?: string;
  language?: string;
  audio_url?: string;
  task_type?: string;
}

export interface CreateTaskResponse {
  task_id: string;
  status: string;
  total_cost: number;
  balance: {
    available: number;
    frozen: number;
    total: number;
  };
  expires_at: string;
  stream_url: string;
}

export interface TaskDetailResponse {
  id: string;
  model_slug: string;
  task_type: string;
  status: string;
  input_params: Record<string, unknown>;
  total_cost: number;
  outputs: Array<{
    id: string;
    url: string;
    thumbnail_url?: string;
    width?: number;
    height?: number;
    duration?: number;
    mime_type?: string;
  }>;
  created_at: string;
  completed_at?: string;
}

// ── Model ────────────────────────────────────────────────
export interface ModelListResponse {
  models: Array<{
    id: string;
    slug: string;
    name: string;
    type: string;
    description?: string;
    capability: {
      supports_image2image?: boolean;
      supports_styles?: string[];
      supported_sizes?: string[];
    };
    pricing: {
      unit_price: number;
      unit: string;
      level_discounts: Record<string, number>;
    };
  }>;
}

// ── OSS ─────────────────────────────────────────────────
export interface StsToken {
  AccessKeyId: string;
  AccessKeySecret: string;
  SecurityToken: string;
  Expiration: string;
  bucket: string;
  endpoint: string;
  upload_dir: string;
}

// ── Recharge ─────────────────────────────────────────────
export interface RechargeCreateRequest {
  amount: number;
  pay_method: 'alipay' | 'wechat' | 'stripe' | 'paypal';
}

export interface RechargeCreateResponse {
  order_no: string;
  pay_url: string;
  qr_code_url?: string;
}

export interface RechargeRecord {
  id: string;
  order_no: string;
  amount: number;
  gift_amount: number;
  pay_method: string;
  status: string;
  paid_at?: string;
  created_at: string;
}
