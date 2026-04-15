// Re-export all Prisma enums for shared use across apps

export {
  UserLevel,
  IdentityType,
  SessionStatus,
  WalletTxType,
  RechargeStatus,
  MembershipStatus,
  TaskType,
  TaskStatus,
  ModelType,
  ProviderType,
  ChannelStatus,
  ReviewStatus,
  RiskLevel,
  OssObjectType,
} from '@prisma/client';

// Extra string literal enums not in Prisma
export type ImageSteps = 'fast' | 'standard' | 'high';

export type PayMethod = 'alipay' | 'wechat' | 'stripe' | 'paypal';

export type SSEEvent =
  | 'task_queued'
  | 'task_started'
  | 'task_progress'
  | 'task_completed'
  | 'task_failed'
  | 'heartbeat';

export type RiskAction = 'generate' | 'login' | 'recharge';

export type AuditProvider = 'aliyun' | 'local';

export type AuditContentType = 'text' | 'image' | 'audio';
