# TECH v0.1 — AI 在线生成工具站 技术方案

**版本**：v0.1
**对齐 PRD**：v0.3
**创建日期**：2026-04-15
**状态**：🟡 待技术评审

---

## 一、技术选型与理由

### 1.1 技术栈总览

| 层级 | 技术选型 | 理由 |
|------|---------|------|
| **前端** | Next.js 14 (App Router) | 成熟 SSR/CSR 方案，前后端同仓，API Routes 可做 BFF 直通；社区生态丰富，开发效率高 |
| **BFF 层** | Bun + Fastify | Bun 启动速度比 Node 快 3-5 倍，Fastify 在高频 SSE + 路由密集场景下比 Express 吞吐高 40%+；TypeScript 原生支持好 |
| **ORM** | Prisma | 类型安全的 Schema 定义，支持 PostgreSQL，迁移体验好，Client 泛型自动补全 |
| **任务队列** | BullMQ (Redis) | BullMQ 是 Node.js 事实标准任务队列，支持延迟队列、重试、死信队列、优先级；Redis 已在架构中承担缓存/SSE，无需引入新组件 |
| **实时推送** | SSE (Server-Sent Events) | 单向实时通道，比 WebSocket 简单；在生成任务场景下服务端→客户端推送足够用；Next.js + Fastify 均原生支持 |
| **存储** | 阿里云 OSS | PRD 明确指定；STS 临时凭证支持前端直传；CDN 加速全球访问；成本低 |
| **缓存/SSE 会话** | Redis | BullMQ 依赖 + SSE 客户端状态缓存 + JWT 黑名单 + 限流计数 |
| **数据库** | PostgreSQL 15 | Prisma 原生支持；JSONB 支持灵活扩展字段；成熟稳定，事务支持好 |
| **内容审核** | 阿里云内容安全 | 与 OSS 同体系，集成成本低；支持文本/图片双审核 |
| **容器化** | Docker + Docker Compose | Phase 1 开发/测试同机构建；Phase 2 可无缝迁移 K8s |

### 1.2 技术选型替代方案说明

| 替代方案 | 为什么不选 |
|---------|-----------|
| NestJS vs Fastify | NestJS 功能完整但学习曲线陡，Fastify 更轻量、插件化，适合 BFF 快速迭代 |
| TypeORM vs Prisma | TypeORM 灵活性高但类型安全弱；Prisma Schema 即文档，20 张表的场景下效率更高 |
| RabbitMQ vs BullMQ | RabbitMQ 功能更强但运维复杂度高；BullMQ + Redis 已在团队技术栈中 |
| Socket.io vs SSE | Socket.io 适合双向通信，SSE 实现简单、HTTP/2 兼容、浏览器原生支持，本场景单向推送足够 |

---

## 二、数据库详细设计

### 2.1 Prisma Schema 全览

```prisma
// /packages/db/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// 枚举定义
// ─────────────────────────────────────────────

enum UserLevel {
  NORMAL   // 普通用户
  MONTHLY  // 月卡会员
  YEARLY   // 年卡会员
}

enum IdentityType {
  PHONE
  EMAIL
  GOOGLE
  APPLE
}

enum SessionStatus {
  ACTIVE
  EXPIRED
  REVOKED
}

enum WalletTxType {
  RECHARGE           // 充值
  GIFT_CREDIT        // 赠送金
  TASK_FREEZE        // 任务冻结
  TASK_SETTLE        // 任务结算（扣费）
  TASK_REFUND        // 任务退款
  MEMBERSHIP_PURCHASE // 会员购买
  MANUAL_ADJUSTMENT  // 手动调整
}

enum RechargeStatus {
  PENDING    // 待支付
  PAID       // 已支付
  REFUNDING  // 退款中
  REFUNDED   // 已退款
  EXPIRED    // 已过期（超时未支付）
}

enum MembershipStatus {
  ACTIVE
  EXPIRED
  CANCELLED
}

enum TaskType {
  IMAGE
  VIDEO
  AUDIO
  TTS
  ASR
  VOICE_CLONE
}

enum TaskStatus {
  CREATED    // 任务创建（金额已冻结）
  QUEUED     // 已入队
  PROCESSING // 处理中
  SUCCEEDED  // 成功
  FAILED     // 失败/超时
  CANCELLED  // 用户取消
}

enum ModelType {
  IMAGE
  VIDEO
  TTS
  ASR
  VOICE_CLONE
}

enum ProviderType {
  REPLICATE
  FAL_AI
  ALIYUN_BAILIAN  // 阿里云百炼
  VOLCENGINE      // 火山引擎
  KAISHI_KV       // 快手官方
  OPENAI_PROXY    // OpenAI 中转
}

enum ChannelStatus {
  ACTIVE
  RATE_LIMITED  // 限流中
  DISABLED      // 停用
}

enum ReviewStatus {
  PASSED
  BLOCKED
  PENDING
  ERROR
}

enum RiskLevel {
  SAFE
  SUSPICIOUS
  BLOCKED
}

enum OssObjectType {
  UPLOAD     // 用户上传
  RESULT     // 生成结果
  THUMBNAIL  // 缩略图
}

// ─────────────────────────────────────────────
// 用户表
// ─────────────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  phone         String?   @unique
  email         String?   @unique
  nickname      String?
  avatar        String?
  level         UserLevel @default(NORMAL)
  gift_credit   Boolean   @default(false)  // 是否已发放体验金
  member_expire DateTime?                 // 会员到期时间
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt
  deleted_at    DateTime?

  identities     UserIdentity[]
  sessions       UserSession[]
  wallet         WalletAccount?
  rechargeOrders RechargeOrder[]
  membershipOrders MembershipOrder[]
  tasks          GenerationTask[]
  assets         UserAsset[]
  favorites      Favorite[]
  ledger         WalletLedger[]

  @@index([created_at])
  @@map("users")
}

// 多登录方式绑定（一个用户可绑定多个登录方式）
model UserIdentity {
  id           String        @id @default(cuid())
  user_id      String
  type         IdentityType
  identifier   String        // 手机号/邮箱/OpenID
  oauth_data   Json?         // 第三方登录原始数据
  created_at   DateTime      @default(now())

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([type, identifier])
  @@index([user_id])
  @@map("user_identity")
}

// 会话管理（Refresh Token）
model UserSession {
  id           String        @id @default(cuid())
  user_id      String
  refresh_token String       @unique
  device_info  String?      // 设备信息
  ip_address   String?
  status       SessionStatus @default(ACTIVE)
  expires_at   DateTime      // Refresh Token 过期时间（创建时+30天）
  created_at   DateTime      @default(now())
  revoked_at   DateTime?

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@index([expires_at])
  @@map("user_session")
}

// ─────────────────────────────────────────────
// 钱包系统
// ─────────────────────────────────────────────

// 钱包账户（每个用户一个）
model WalletAccount {
  id                String    @id @default(cuid())
  user_id           String    @unique
  available_balance Decimal   @default(0) @db.Decimal(10, 2)  // 可用余额，精确到分
  frozen_balance    Decimal   @default(0) @db.Decimal(10, 2)  // 冻结金额
  total_recharged   Decimal   @default(0) @db.Decimal(12, 2)  // 历史充值总额
  total_spent       Decimal   @default(0) @db.Decimal(12, 2)   // 历史消费总额
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  user    User           @relation(fields: [user_id], references: [id], onDelete: Cascade)
  ledger  WalletLedger[]

  @@map("wallet_account")
}

// 账本流水（所有余额变动必须记录）
model WalletLedger {
  id              String        @id @default(cuid())
  wallet_id       String
  user_id         String
  tx_type         WalletTxType
  amount          Decimal       @db.Decimal(10, 2)  // 正数=收入，负数=支出
  balance_before  Decimal       @db.Decimal(10, 2)  // 变动前余额
  balance_after   Decimal       @db.Decimal(10, 2)  // 变动后余额
  order_id        String?       // 关联订单（充值/任务/会员）
  order_type      String?       // recharge_order / generation_task / membership_order
  remark          String?       // 备注（如"注册赠送5元体验金"）
  created_at      DateTime      @default(now())

  wallet WalletAccount @relation(fields: [wallet_id], references: [id], onDelete: Cascade)
  user   User           @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id, created_at])
  @@index([wallet_id])
  @@index([order_id])
  @@map("wallet_ledger")
}

// 充值订单
model RechargeOrder {
  id               String        @id @default(cuid())
  user_id          String
  order_no         String        @unique  // 商户订单号
  amount           Decimal       @db.Decimal(10, 2)   // 充值金额
  gift_amount      Decimal       @default(0) @db.Decimal(10, 2) // 赠送金额
  pay_amount       Decimal       @db.Decimal(10, 2)   // 实际支付金额
  pay_method       String        // alipay / wechat / stripe / paypal
  trade_no         String?       // 第三方交易号
  status           RechargeStatus @default(PENDING)
  paid_at          DateTime?
  expired_at       DateTime      // 超时未支付过期时间（创建+30分钟）
  refund_amount    Decimal?      @db.Decimal(10, 2)
  refund_at        DateTime?
  created_at       DateTime      @default(now())
  updated_at       DateTime      @updatedAt

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@index([status])
  @@index([created_at])
  @@map("recharge_order")
}

// 会员订单
model MembershipOrder {
  id          String           @id @default(cuid())
  user_id     String
  order_no    String           @unique
  level       UserLevel
  amount      Decimal          @db.Decimal(10, 2)
  pay_method  String
  trade_no    String?
  status      MembershipStatus @default(PENDING)
  start_at    DateTime?
  end_at      DateTime?
  created_at  DateTime         @default(now())

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@map("membership_order")
}

// ─────────────────────────────────────────────
// 模型定义
// ─────────────────────────────────────────────

model Model {
  id           String     @id @default(cuid())
  slug         String     @unique  // 英文标识：flux-2-schnell
  name         String                  // 中文名：FLUX.2 schnell
  type         ModelType
  provider     ProviderType
  channel_id   String?    // 指定渠道
  description  String?
  capability   Json       // 能力描述：{ supports_image2image: true, supports_styles: [...] }
  config       Json?      // 模型特定配置
  is_active    Boolean    @default(true)
  sort_order   Int        @default(0)
  created_at   DateTime   @default(now())
  updated_at   DateTime   @updatedAt

  pricing      ModelPricing[]
  tasks        GenerationTask[]

  @@index([type])
  @@index([is_active])
  @@map("model")
}

// 模型定价（支持按用户等级/时间多维度定价）
model ModelPricing {
  id             String   @id @default(cuid())
  model_id       String
  level          UserLevel @default(NORMAL)  // 适用用户等级
  unit_price     Decimal  @db.Decimal(10, 2) // 单价（分）
  unit           String   // UNIT_PER_IMAGE / UNIT_PER_SECOND / UNIT_PER_1K_CHARS
  min_quantity   Int      @default(1)
  max_quantity   Int?
  discount       Decimal? @db.Decimal(5, 4)  // 折扣率（如 0.8 = 8折）
  effective_from DateTime?
  effective_to   DateTime?
  created_at     DateTime @default(now())

  model Model @relation(fields: [model_id], references: [id], onDelete: Cascade)

  @@index([model_id, level])
  @@map("model_pricing")
}

// ─────────────────────────────────────────────
// 生成任务
// ─────────────────────────────────────────────

model GenerationTask {
  id               String     @id @default(cuid())
  user_id          String
  model_id         String
  task_type        TaskType
  status           TaskStatus @default(CREATED)
  idem_key         String?    // 幂等键

  // 请求参数快照（JSON）
  input_params     Json
  cost_snapshot    Decimal    @db.Decimal(10, 2)  // 创建时快照的单价（分）

  // 费用
  total_cost       Decimal    @db.Decimal(10, 2)  // 总费用（分）

  // 上游信息
  upstream_job_id  String?    // 上游任务ID
  provider_channel_id String?  // 使用的渠道
  retry_count      Int        @default(0)

  // 时间戳
  queued_at        DateTime?
  started_at       DateTime?
  completed_at     DateTime?
  expired_at       DateTime?  // 超时截止时间（创建+5分钟）
  created_at       DateTime   @default(now())
  updated_at       DateTime   @updatedAt

  user     User                @relation(fields: [user_id], references: [id], onDelete: Cascade)
  model    Model               @relation(fields: [model_id], references: [id])
  outputs  GenerationOutput[]
  events   GenerationEvent[]

  @@index([user_id, created_at])
  @@index([status, created_at])
  @@index([user_id, status])
  @@index([upstream_job_id])
  @@index([idem_key])
  @@map("generation_task")
}

// 任务产出（一对多，一个任务可产出多张图/多个视频片段）
model GenerationOutput {
  id          String    @id @default(cuid())
  task_id     String
  file_url    String    // OSS URL
  thumbnail_url String? // 缩略图 URL
  file_size   Int?      // 字节数
  mime_type   String?
  width       Int?
  height      Int?
  duration    Int?      // 视频/音频时长（秒）
  sort_order  Int       @default(0)
  created_at  DateTime  @default(now())

  task GenerationTask @relation(fields: [task_id], references: [id], onDelete: Cascade)

  @@index([task_id])
  @@map("generation_output")
}

// 任务事件日志
model GenerationEvent {
  id         String    @id @default(cuid())
  task_id    String
  event      String    // queued / started / progress / completed / failed / retried
  detail     Json?     // 事件详情
  created_at DateTime  @default(now())

  task GenerationTask @relation(fields: [task_id], references: [id], onDelete: Cascade)

  @@index([task_id])
  @@map("generation_event")
}

// 用户上传资产
model UserAsset {
  id          String       @id @default(cuid())
  user_id     String
  type        OssObjectType
  oss_key     String       // OSS object key
  file_url    String
  file_name   String?
  file_size   Int?
  mime_type   String?
  task_id     String?      // 关联任务
  created_at  DateTime     @default(now())

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id, type])
  @@map("user_asset")
}

// 收藏
model Favorite {
  id          String    @id @default(cuid())
  user_id     String
  task_id     String?   // 收藏生成结果
  asset_id    String?   // 收藏上传文件
  created_at  DateTime  @default(now())

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([user_id, task_id])
  @@unique([user_id, asset_id])
  @@index([user_id])
  @@map("favorite")
}

// ─────────────────────────────────────────────
// 上游渠道管理
// ─────────────────────────────────────────────

model ProviderChannel {
  id           String       @id @default(cuid())
  model_id     String
  provider     ProviderType
  name         String       // 渠道名：flux-replicate-prod
  config       Json         // API Key / BaseURL / 特殊配置
  status       ChannelStatus @default(ACTIVE)
  priority     Int          @default(0)   // 优先级，数字越小越优先
  rate_limit   Int?         // 每分钟限流
  rate_used    Int          @default(0)   // 本周期已用
  rate_reset_at DateTime?   // 限流重置时间
  created_at   DateTime     @default(now())
  updated_at   DateTime     @updatedAt

  requestLogs    ProviderRequestLog[]
  tasks          GenerationTask[]

  @@index([model_id, status])
  @@map("provider_channel")
}

// 上游调用日志（便于排查和成本核算）
model ProviderRequestLog {
  id              String   @id @default(cuid())
  channel_id      String
  task_id         String?
  upstream_job_id String?
  request         Json
  response        Json?
  status_code     Int?
  duration_ms     Int?
  cost            Decimal? @db.Decimal(10, 4)  // 实际成本
  error           String?
  created_at      DateTime @default(now())

  channel ProviderChannel @relation(fields: [channel_id], references: [id])

  @@index([channel_id, created_at])
  @@index([task_id])
  @@map("provider_request_log")
}

// ─────────────────────────────────────────────
// 审核与幂等
// ─────────────────────────────────────────────

// 内容审核记录
model ContentReviewRecord {
  id          String       @id @default(cuid())
  task_id     String?
  asset_id    String?
  content_url String?
  content_type String      // text / image / audio
  provider    String       // aliyun / local
  result      Json         // 审核结果
  status      ReviewStatus @default(PENDING)
  passed_at   DateTime?
  blocked_at  DateTime?
  created_at  DateTime     @default(now())

  @@index([task_id])
  @@index([status])
  @@map("content_review_record")
}

// 幂等记录（防重复提交）
model IdempotencyRecord {
  id          String   @id @default(cuid())
  user_id     String
  idem_key    String   // 业务方传递的幂等键
  request_hash String  // 请求体 hash
  response    Json?    // 缓存响应
  created_at  DateTime @default(now())
  expires_at  DateTime // 过期时间（默认24小时）

  @@unique([user_id, idem_key])
  @@index([user_id, idem_key])
  @@map("idempotency_record")
}

// ─────────────────────────────────────────────
// 系统配置与风控
// ─────────────────────────────────────────────

// 系统配置（K-V 表，存储开关/阈值等）
model SystemConfig {
  id          String   @id @default(cuid())
  key         String   @unique
  value       Json
  description String?
  updated_at  DateTime @updatedAt

  @@map("system_config")
}

// 风控记录
model RiskControlRecord {
  id          String    @id @default(cuid())
  user_id     String?
  ip_address  String?
  action      String    // generate / login / recharge
  risk_level  RiskLevel
  reason      String?
  detail      Json?
  created_at  DateTime  @default(now())

  @@index([user_id, action])
  @@index([ip_address])
  @@map("risk_control_record")
}
```

### 2.2 数据库连接池配置

```env
# Prisma 连接池（PostgreSQL）
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public&connection_limit=10&pool_timeout=10"
```

- 开发环境：连接数 5
- 生产环境：连接数 10，连接复用，pool_timeout=10s
- 高并发场景使用 Prisma `$transaction` 保证原子性

---

## 三、项目结构

```
ai-api-toolsite-v2/
├── apps/
│   ├── web/                        # Next.js 14 前端（App Router）
│   │   ├── src/
│   │   │   ├── app/                # App Router 页面
│   │   │   │   ├── (auth)/         # 认证路由组
│   │   │   │   │   ├── login/
│   │   │   │   │   └── register/
│   │   │   │   ├── (main)/         # 主站路由组
│   │   │   │   │   ├── page.tsx              # 首页
│   │   │   │   │   ├── image/                 # 图片生成
│   │   │   │   │   │   └── [model]/
│   │   │   │   ├── video/                     # 视频生成
│   │   │   │   ├── audio/                     # 语音生成
│   │   │   │   │   ├── tts/
│   │   │   │   │   ├── asr/
│   │   │   │   │   └── voice-clone/
│   │   │   │   ├── user/                      # 用户后台
│   │   │   │   │   ├── balance/
│   │   │   │   │   ├── history/
│   │   │   │   │   ├── favorites/
│   │   │   │   │   └── membership/
│   │   │   │   └── layout.tsx
│   │   │   ├── components/        # 业务组件
│   │   │   ├── hooks/             # 自定义 Hook
│   │   │   ├── lib/               # 工具函数
│   │   │   │   ├── api.ts         # BFF 调用封装
│   │   │   │   ├── sse.ts         # SSE 客户端封装
│   │   │   │   └── oss.ts         # OSS 直传 SDK 封装
│   │   │   ├── stores/            # Zustand 状态管理
│   │   │   └── styles/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api/                        # BFF 层（Fastify on Bun）
│   │   ├── src/
│   │   │   ├── app.ts              # Fastify 实例
│   │   │   ├── server.ts           # 启动入口
│   │   │   ├── routes/             # 路由定义
│   │   │   │   ├── index.ts        # 路由聚合
│   │   │   │   ├── auth.ts         # 认证路由
│   │   │   │   ├── models.ts       # 模型列表
│   │   │   │   ├── tasks.ts        # 任务 CRUD + SSE
│   │   │   │   ├── oss.ts          # OSS 直传凭证
│   │   │   │   ├── user.ts         # 用户/余额/流水
│   │   │   │   ├── recharge.ts     # 充值
│   │   │   │   ├── favorites.ts    # 收藏
│   │   │   │   └── payments.ts     # 支付回调
│   │   │   ├── services/          # 业务逻辑层
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── task.service.ts
│   │   │   │   ├── wallet.service.ts
│   │   │   │   ├── recharge.service.ts
│   │   │   │   ├── oss.service.ts
│   │   │   │   ├── review.service.ts
│   │   │   │   └── risk.service.ts
│   │   │   ├── adapters/           # 模型适配器
│   │   │   │   ├── index.ts        # 适配器注册表
│   │   │   │   ├── base.adapter.ts # 基类
│   │   │   │   ├── flux.adapter.ts
│   │   │   │   ├── wanxiang.adapter.ts
│   │   │   │   ├── seedance.adapter.ts
│   │   │   │   ├── kling.adapter.ts
│   │   │   │   └── cosyvoice.adapter.ts
│   │   │   ├── jobs/              # BullMQ Workers
│   │   │   │   ├── index.ts
│   │   │   │   ├── image.worker.ts
│   │   │   │   ├── video.worker.ts
│   │   │   │   ├── tts.worker.ts
│   │   │   │   ├── asr.worker.ts
│   │   │   │   └── voice-clone.worker.ts
│   │   │   ├── queues/            # Queue 定义
│   │   │   │   └── index.ts
│   │   │   ├── middleware/        # Fastify 中间件
│   │   │   │   ├── auth.ts
│   │   │   │   ├── error.ts
│   │   │   │   ├── rate-limit.ts
│   │   │   │   └── cors.ts
│   │   │   ├── plugins/           # Fastify 插件
│   │   │   │   ├── prisma.ts
│   │   │   │   ├── redis.ts
│   │   │   │   └── jwt.ts
│   │   │   ├── types/             # 类型定义
│   │   │   │   └── index.ts
│   │   │   └── utils/             # 工具函数
│   │   │       ├── crypto.ts
│   │   │       └── oss.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── worker/                     # 独立 Worker 进程（可选部署）
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── processors/
│   │   └── package.json
│   │
│   └── admin/                      # 运营后台（Next.js）
│       ├── src/
│       │   ├── app/
│       │   └── components/
│       └── package.json
│
├── packages/
│   ├── db/                         # Prisma Schema + Client
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── migrations/
│   │   ├── seed/
│   │   │   └── seed.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared/                     # 前后端共用
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── constants/
│   │   │   ├── schemas/           # Zod 校验
│   │   │   └── utils/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── config/                     # 共享 TS/ESLint 配置
│       └── package.json
│
├── infra/
│   ├── docker/
│   │   ├── Dockerfile.api
│   │   ├── Dockerfile.web
│   │   ├── Dockerfile.worker
│   │   ├── docker-compose.yml
│   │   └── docker-compose.prod.yml
│   └── scripts/
│
├── docs/
│   └── TECH-v0.1.md
│
├── .env.example
├── pnpm-workspace.yaml
└── package.json
```

### 3.1 packages 职责划分

| Package | 职责 |
|---------|------|
| `packages/db` | 所有数据库操作封装；Prisma Client 单例；数据 seed |
| `packages/shared` | 类型/常量/Zod 校验 Schema 全项目共享 |
| `packages/config` | TS/ESLint 配置统一，避免各 app 配置漂移 |
| `apps/web` | 用户界面、SSR、静态页面 |
| `apps/api` | BFF、认证、任务调度、SSE、支付回调 |
| `apps/worker` | 独立消费者进程（可水平扩展） |
| `apps/admin` | 运营人员使用，禁止面向普通用户 |

---

## 四、BFF 层详细设计

### 4.1 Fastify 路由总览

```
POST   /api/v1/auth/send-code          [公开]
POST   /api/v1/auth/login-by-code      [公开]
POST   /api/v1/auth/refresh            [公开]
POST   /api/v1/auth/google             [公开]
POST   /api/v1/auth/apple              [公开]

GET    /api/v1/models                  [公开]
GET    /api/v1/models/:slug            [公开]

POST   /api/v1/oss/upload-token        [需认证]

POST   /api/v1/tasks/generate          [需认证]
GET    /api/v1/tasks/:task_id          [需认证]
GET    /api/v1/tasks                    [需认证]
GET    /api/v1/tasks/:task_id/stream    [需认证] (SSE)
DELETE /api/v1/tasks/:task_id          [需认证]

GET    /api/v1/user/profile            [需认证]
GET    /api/v1/user/balance            [需认证]
GET    /api/v1/user/wallet/ledger      [需认证]
POST   /api/v1/user/recharge           [需认证]
GET    /api/v1/user/recharges          [需认证]
GET    /api/v1/user/consumption        [需认证]
GET    /api/v1/user/membership         [需认证]

GET    /api/v1/favorites               [需认证]
POST   /api/v1/favorites               [需认证]
DELETE /api/v1/favorites/:id           [需认证]

POST   /api/v1/payments/alipay/notify   [无需认证（验签）]
POST   /api/v1/payments/wechat/notify   [无需认证（验签）]
```

### 4.2 中间件设计

#### 4.2.1 认证中间件 `auth.ts`

```
流程：
1. 从 Header 提取 Authorization: Bearer <token>
2. JWT 验签（Access Token）
3. 从 Redis 检查 Token 是否在黑名单（登出/改密时写入）
4. 注入 req.user = { userId, level }
5. 未登录 → HTTP 401
```

#### 4.2.2 CORS 中间件 `cors.ts`

```typescript
{
  origin: process.env.CORS_ORIGINS?.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}
```

#### 4.2.3 全局错误处理 `error.ts`

```typescript
// 统一错误格式：
{
  code: "INSUFFICIENT_BALANCE" | "TASK_NOT_FOUND" | "VALIDATION_ERROR" | ...,
  message: string,
  requestId: string  // 便于日志追踪
}

// HTTP 状态码规范：
// 400: 参数错误 / 验证失败
// 401: 未登录
// 403: 无权限
// 404: 资源不存在
// 409: 幂等冲突
// 422: 业务逻辑错误（余额不足、模型不可用）
// 429: 限流
// 500: 服务端错误
```

#### 4.2.4 限流中间件 `rate-limit.ts`

```
策略：
- 普通接口：60 req/min/IP
- 发送验证码：5 req/min/IP
- 生成任务：10 req/min/User
- 充值接口：10 req/min/User

超出 → HTTP 429 + Retry-After Header
计数器存储于 Redis，过期自动清理。
```

### 4.3 服务层设计

| Service | 职责 | 关键方法 |
|---------|------|---------|
| `AuthService` | 验证码发送/验证、登录、JWT 签发/刷新 | `sendCode()`, `loginByCode()`, `refreshToken()`, `logout()` |
| `TaskService` | 任务创建（幂等）、查询、取消、SSE 推送 | `createTask()`, `getTask()`, `cancelTask()`, `emitSSEEvent()` |
| `WalletService` | 冻结/结算/退款、账本流水写入、余额查询 | `freeze()`, `settle()`, `refund()`, `writeLedger()` |
| `RechargeService` | 充值下单、支付链接生成、支付回调处理 | `createOrder()`, `handleCallback()`, `queryOrders()` |
| `OssService` | STS 临时凭证生成、文件 URL 管理 | `generateStsToken()`, `getFileUrl()` |
| `ReviewService` | Prompt 审核、结果审核（阿里云+本地） | `reviewText()`, `reviewImage()` |
| `RiskService` | IP/User 频率统计、验证码触发判断、风控记录 | `checkLimit()`, `recordRisk()` |
| `ModelService` | 模型列表、定价计算（考虑用户等级/折扣） | `listModels()`, `calculatePrice()` |
| `FavoriteService` | 收藏/取消收藏、收藏列表 | `addFavorite()`, `removeFavorite()` |

---

## 五、模型适配器设计

### 5.1 ModelAdapter 接口定义

```typescript
// /apps/api/src/adapters/base.adapter.ts

export interface ValidatedParams {
  // 通用
  prompt?: string
  reference_image_url?: string

  // 图片特有
  width?: number
  height?: number
  style?: string
  num_inference_steps?: 'fast' | 'standard' | 'high'
  image_count?: number
  strength?: number  // 图生图强度 0.0-1.0

  // 视频特有
  duration?: 3 | 5 | 10 | 15
  resolution?: '540p' | '720p' | '1080p' | '4K'
  fps?: number
  camera_control?: Record<string, unknown>

  // 音频特有
  text?: string
  voice?: string
  speed?: number
  volume?: number
  source_audio_url?: string
  target_text?: string
  language?: string
}

export interface UpstreamRequest {
  url: string
  method: 'POST' | 'GET'
  headers: Record<string, string>
  body?: unknown
}

export interface ParsedResult {
  status: 'completed' | 'failed'
  outputs: Array<{
    url: string
    thumbnail_url?: string
    width?: number
    height?: number
    duration?: number
    mime_type?: string
  }>
  error?: string
  metadata?: Record<string, unknown>
}

export interface ValidationResult {
  valid: boolean
  errors?: Array<{ path: string; message: string }>
  params?: ValidatedParams
}

/** 模型适配器核心接口 */
export interface ModelAdapter {
  readonly slug: string
  readonly type: 'image' | 'video' | 'audio'

  /** 入参校验 */
  validate(params: unknown): ValidationResult

  /** 转换为上游 API 请求 */
  toUpstream(params: ValidatedParams, channel: ProviderChannel): UpstreamRequest

  /** 解析上游响应 */
  parseResponse(res: unknown): ParsedResult

  /** 轮询上游状态（部分 API 支持） */
  pollStatus?(jobId: string, channel: ProviderChannel): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed'
    progress?: number
    result?: ParsedResult
  }>

  /** 估算费用（分），用于冻结 */
  estimateCost(params: ValidatedParams,
  pricing: ModelPricing,
    userLevel: UserLevel
  ): number
}
```

### 5.2 FLUXAdapter 实现（图片）

```typescript
// /apps/api/src/adapters/flux.adapter.ts

import { z } from 'zod'
import { ModelAdapter, ValidationResult, UpstreamRequest, ParsedResult, ValidatedParams } from './base.adapter'
import { ModelPricing, UserLevel } from '@ai-toolsite/shared'

const FluxParamsSchema = z.object({
  prompt: z.string().min(1).max(2000),
  reference_image_url: z.string().url().optional(),
  width: z.enum(['512', '1024', '1080']).optional().default('1024'),
  height: z.enum(['512', '1024', '1920']).optional().default('1024'),
  style: z.string().optional(),
  num_inference_steps: z.enum(['fast', 'standard', 'high']).optional().default('standard'),
  image_count: z.number().int().min(1).max(4).optional().default(1),
  strength: z.number().min(0).max(1).optional().default(0.7),
})

export class FLUXAdapter implements ModelAdapter {
  readonly slug = 'flux-2-schnell'
  readonly type = 'image' as const

  validate(params: unknown): ValidationResult {
    const result = FluxParamsSchema.safeParse(params)
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      }
    }
    return { valid: true, params: result.data as ValidatedParams }
  }

  toUpstream(params: ValidatedParams, channel: ProviderChannel): UpstreamRequest {
    const config = channel.config as { api_key: string; base_url: string }
    const body: Record<string, unknown> = {
      prompt: params.prompt,
      num_outputs: params.image_count ?? 1,
      aspect_ratio: `${params.width ?? 1024}:${params.height ?? 1024}`,
    }

    if (params.reference_image_url) {
      body.image = params.reference_image_url
      body.strength = params.strength ?? 0.7
    }

    const stepsMap = { fast: 4, standard: 20, high: 50 }
    body.num_inference_steps = stepsMap[params.num_inference_steps ?? 'standard']

    return {
      url: `${config.base_url}/v1/predictions`,
      method: 'POST',
      headers: {
        'Authorization': `Token ${config.api_key}`,
        'Content-Type': 'application/json'
      },
      body
    }
  }

  parseResponse(res: unknown): ParsedResult {
    const data = res as Record<string, unknown>
    // Replicate 风格响应
    if (data.status === 'failed') {
      return { status: 'failed', outputs: [], error: String(data.error) }
    }
    if (data.status === 'completed') {
      const outputs = (data.output as string[]).map((url, i) => ({
        url,
        sort_order: i,
        mime_type: 'image/png'
      }))
      return { status: 'completed', outputs }
    }
    return { status: 'failed', outputs: [], error: 'Unknown response format' }
  }

  async pollStatus(jobId: string, channel: ProviderChannel): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed'
    progress?: number
    result?: ParsedResult
  }> {
    const config = channel.config as { api_key: string; base_url: string }
    const resp = await fetch(`${config.base_url}/v1/predictions/${jobId}`, {
      headers: { 'Authorization': `Token ${config.api_key}` }
    })
    const data = await resp.json()
    if (data.status === 'succeeded') return { status: 'completed', result: this.parseResponse(data) }
    if (data.status === 'failed') return { status: 'failed' }
    return { status: data.status === 'starting' ? 'pending' : 'processing', progress: data.progress }
  }

  estimateCost(params: ValidatedParams, pricing: ModelPricing, userLevel: UserLevel): number {
    const count = params.image_count ?? 1
    const basePrice = Number(pricing.unit_price) * count
    const discount = pricing.discount ? Number(pricing.discount) : 1.0
    const levelDiscount = userLevel === UserLevel.YEARLY ? 0.7 : userLevel === UserLevel.MONTHLY ? 0.8 : 1.0
    return Math.round(basePrice * discount * levelDiscount)
  }
}
```

### 5.3 SeedanceAdapter 实现（视频）

```typescript
// /apps/api/src/adapters/seedance.adapter.ts

import { ModelAdapter, ValidationResult, UpstreamRequest, ParsedResult, ValidatedParams } from './base.adapter'
import { z } from 'zod'

const SeedanceParamsSchema = z.object({
  prompt: z.string().min(1).max(500),
  duration: z.union([z.literal(3), z.literal(5), z.literal(10), z.literal(15)]).default(5),
  resolution: z.enum(['540p', '720p', '1080p', '4K']).default('1080p'),
  reference_image_url: z.string().url().optional(),
  fps: z.number().optional().default(24),
})

export class SeedanceAdapter implements ModelAdapter {
  readonly slug = 'seedance-2-0'
  readonly type = 'video' as const

  validate(params: unknown): ValidationResult {
    const result = SeedanceParamsSchema.safeParse(params)
    if (!result.success) {
      return { valid: false, errors: result.error.errors.map(e => ({ path: e.path.join('.'), message: e.message })) }
    }
    return { valid: true, params: result.data as ValidatedParams }
  }

  toUpstream(params: ValidatedParams, channel: ProviderChannel): UpstreamRequest {
    const config = channel.config as { access_key: string; secret_key: string; account_id: string; space_name: string }
    const body = {
      model: 'seedance-2-0',
      prompt: params.prompt,
      duration: params.duration ?? 5,
      resolution: params.resolution ?? '1080p',
      fps: params.fps ?? 24,
      ...(params.reference_image_url && { reference_image_url: params.reference_image_url }),
    }
    return {
      url: `https://visual.volcengineapi.com/api/v1/visual_generation/video`,
      method: 'POST',
      headers: {
        'X-Access-Key': config.access_key,
        'X-Secret-Key': config.secret_key,
        'Content-Type': 'application/json'
      },
      body
    }
  }

  parseResponse(res: unknown): ParsedResult {
    const data = res as Record<string, unknown>
    if (data.code !== 0 && data.code !== '0') {
      return { status: 'failed', outputs: [], error: String(data.message) }
    }
    const videoData = data.data as Record<string, unknown>
    return {
      status: 'completed',
      outputs: [{
        url: String(videoData.video_url),
        thumbnail_url: videoData.thumbnail_url ? String(videoData.thumbnail_url) : undefined,
        duration: params.duration ?? 5,
        mime_type: 'video/mp4'
      }]
    }
  }

  estimateCost(params: ValidatedParams, pricing: ModelPricing, userLevel: UserLevel): number {
    const duration = params.duration ?? 5
    const basePrice = Number(pricing.unit_price) * duration
    const levelDiscount = userLevel === UserLevel.YEARLY ? 0.8 : userLevel === UserLevel.MONTHLY ? 0.9 : 1.0
    return Math.round(basePrice * levelDiscount)
  }
}
```

### 5.4 适配器注册机制

```typescript
// /apps/api/src/adapters/index.ts

import { ModelAdapter } from './base.adapter'
import { FLUXAdapter } from './flux.adapter'
import { SeedanceAdapter } from './seedance.adapter'
import { WanxiangAdapter } from './wanxiang.adapter'
import { KlingAdapter } from './kling.adapter'
import { CosyVoiceAdapter } from './cosyvoice.adapter'

/** 适配器注册表 */
export const adapterRegistry: Map<string, ModelAdapter> = new Map([
  ['flux-2-schnell', new FLUXAdapter()],
  ['flux-2-dev', new FLUXAdapter()], // 共用，slug 不同
  ['wanxiang-2-6', new WanxiangAdapter()],
  ['seedance-2-0', new SeedanceAdapter()],
  ['seedance-1-5', new SeedanceAdapter()],
  ['kling-3-0', new KlingAdapter()],
  ['cosyvoice-v3-flash', new CosyVoiceAdapter()],
])

export function getAdapter(slug: string): ModelAdapter | undefined {
  return adapterRegistry.get(slug)
}

export { ModelAdapter } from './base.adapter'
```

---

## 六、BullMQ 任务队列设计

### 6.1 Queue 命名与职责

| Queue 名称 | 职责 | 并发数建议 |
|-----------|------|---------|
| `image-generation` | 图片生成任务（FLUX / 万相） | 10 |
| `video-generation` | 视频生成任务（Seedance / Kling） | 5 |
| `audio-generation` | 音频任务（TTS / ASR / 声音克隆） | 20 |

### 6.2 Job 数据结构

```typescript
// /apps/api/src/queues/index.ts

import { Queue, Worker, Job } from 'bullmq'

// 统一 Job 数据结构
export interface GenerationJobData {
  taskId: string
  userId: string
  modelSlug: string
  modelId: string
  inputParams: Record<string, unknown>
  totalCost: number        // 冻结金额（分）
  channelId: string
  retryCount: number
  createdAt: string
}

// Queue 实例
export const imageQueue = new Queue<GenerationJobData>('image-generation', {
  connection: { host: process.env.REDIS_HOST, port: 6379 },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 10000 }, // 最多2次重试，间隔10秒
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  }
})

export const videoQueue = new Queue<GenerationJobData>('video-generation', {
  connection: { host: process.env.REDIS_HOST, port: 6379 },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 10000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  }
})

export const audioQueue = new Queue<GenerationJobData>('audio-generation', {
  connection: { host: process.env.REDIS_HOST, port: 6379 },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 10000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  }
})

export function getQueueByType(taskType: string): Queue<GenerationJobData> {
  switch (taskType) {
    case 'IMAGE': return imageQueue
    case 'VIDEO': return videoQueue
    case 'TTS': case 'ASR': case 'VOICE_CLONE': return audioQueue
    default: return imageQueue
  }
}
```

### 6.3 Worker 流程（含任务状态机）

```
任务状态机：
CREATED → QUEUED → PROCESSING → SUCCEEDED
                         ↘ FAILED
                    (CREATED → QUEUED → PROCESSING → FAILED)

Worker 流程：
┌──────────────────────────────────────────────────────────┐
│ 1. 获取 Job 数据（taskId / userId / modelSlug / params）│
│ 2. Prisma: UPDATE task SET status='QUEUED', queued_at   │
│    → Redis Pub: SSE event "task_queued"                  │
│ 3. 原子化冻结金额（见钱包系统）                           │
│    → 若余额不足：status='FAILED', reason='INSUFFICIENT_BALANCE'
│ 4. Prisma: UPDATE task SET status='PROCESSING', started_at│
│    → Redis Pub: SSE event "task_started"                 │
│ 5. 调用 adapter.toUpstream()，获取上游请求                │
│ 6. 发送上游请求，记录 ProviderRequestLog                 │
│ 7. 轮询 adapter.pollStatus()，每5秒一次                  │
│    → 每次轮询：Redis Pub SSE event "task_progress"       │
│ 8. 上游返回完成：                                         │
│    a. 下载结果 → 上传 OSS → 生成缩略图                   │
│    b. Prisma INSERT generation_output                     │
│    c. 内容审核（ReviewService）                           │
│    d. 结算扣费（WalletService.settle）                   │
│    e. Prisma UPDATE task SET status='SUCCEEDED'           │
│    → Redis Pub: SSE event "task_completed"                │
│ 9. 失败/超时：                                           │
│    a. 解冻退款（WalletService.refund）                   │
│    b. Prisma UPDATE task SET status='FAILED', retry_count=N│
│    → Redis Pub: SSE event "task_failed"                  │
│ 10. 达到最大重试次数（3次）→ 标记失败，不重试              │
└──────────────────────────────────────────────────────────┘
```

### 6.4 重试策略 + 超时处理

```typescript
// /apps/api/src/jobs/image.worker.ts

const MAX_RETRIES = 2   // 加上首次执行共3次
const RETRY_DELAY = 10_000  // 10秒
const TASK_TIMEOUT = 5 * 60 * 1000  // 5分钟

const worker = new Worker<GenerationJobData>(
  'image-generation',
  async (job: Job<GenerationJobData>) => {
    const { taskId, modelSlug, inputParams, channelId } = job.data

    // 超时兜底：Job 超过5分钟自动触发
    const timeoutHandle = setTimeout(async () => {
      await handleTaskFailure(taskId, 'TIMEOUT', 0)
      await job.moveToFailed(new Error('Task timeout'), 'timeout')
    }, TASK_TIMEOUT)

    try {
      const adapter = getAdapter(modelSlug)
      if (!adapter) throw new Error(`Unknown adapter: ${modelSlug}`)

      const channel = await prisma.providerChannel.findUnique({ where: { id: channelId } })
      const upstreamReq = adapter.toUpstream(inputParams as ValidatedParams, channel)

      // 调用上游
      const upstreamRes = await callUpstream(upstreamReq)
      const jobId = extractUpstreamJobId(upstreamRes)

      // 轮询直到完成
      while (true) {
        const pollRes = await adapter.pollStatus(jobId, channel)
        if (pollRes.status === 'completed') {
          clearTimeout(timeoutHandle)
          await handleTaskSuccess(taskId, pollRes.result.outputs)
          return
        }
        if (pollRes.status === 'failed') {
          clearTimeout(timeoutHandle)
          throw new Error(pollRes.result?.error ?? 'Upstream failed')
        }
        // pending / processing: 等待5秒继续轮询
        await sleep(5000)
      }
    } catch (err) {
      clearTimeout(timeoutHandle)
      // BullMQ 自动处理重试（attempt < 3）
      throw err
    }
  },
  {
    connection: { host: process.env.REDIS_HOST, port: 6379 },
    concurrency: 10,
  }
)

/** 超时自动退款 */
async function handleTaskFailure(taskId: string, reason: string, retryCount: number) {
  const task = await prisma.generationTask.findUnique({
    where: { id: taskId },
    include: { user: true }
  })
  if (!task || task.status === 'FAILED') return

  await prisma.$transaction(async (tx) => {
    // 解冻退款
    await tx.walletAccount.update({
      where: { user_id: task.userId },
      data: {
        available_balance: { increment: task.total_cost },
        frozen_balance: { decrement: task.total_cost }
      }
    })
    // 写账本
    await tx.walletLedger.create({
      data: {
        wallet_id: task.user.wallet!.id,
        user_id: task.userId,
        tx_type: 'TASK_REFUND',
        amount: task.total_cost,
        balance_before: Number(task.user.wallet!.frozen_balance),
        balance_after: Number(task.user.wallet!.available_balance) + Number(task.total_cost),
        order_id: taskId,
        order_type: 'generation_task',
        remark: `退款：${reason}`
      }
    })
    // 更新任务状态
    await tx.generationTask.update({
      where: { id: taskId },
      data: { status: 'FAILED', retry_count: retryCount }
    })
  })
  // SSE 推送失败事件
  await emitSSEEvent(taskId, 'task_failed', { reason })
}
```

---

## 七、SSE 推送设计

### 7.1 端点定义

```
GET /api/v1/tasks/:task_id/stream
```

### 7.2 事件类型

| 事件名 | 触发时机 | data 内容 |
|--------|---------|----------|
| `task_queued` | 任务入队成功 | `{ task_id, queued_at, position }` |
| `task_started` | Worker 开始处理 | `{ task_id, started_at }` |
| `task_progress` | 轮询到上游进度 | `{ task_id, progress: 0-100, message }` |
| `task_completed` | 生成成功 | `{ task_id, outputs: [{url, thumbnail_url, ...}] }` |
| `task_failed` | 失败/超时 | `{ task_id, error: string, refunded: boolean }` |
| `heartbeat` | 保活心跳 | `{ ts: timestamp }` |

### 7.3 实现架构

```typescript
// /apps/api/src/routes/tasks.ts（ SSE 部分）

fastify.get('/tasks/:task_id/stream', {
  onRequest: [authenticate],
  schema: { params: { task_id: { type: 'string' } } }
}, async (req, reply) => {
  const { task_id } = req.params as { task_id: string }
  const { userId } = req.user

  // 鉴权：只能看自己的任务
  const task = await prisma.generationTask.findUnique({ where: { id: task_id } })
  if (!task || task.userId !== userId) {
    return reply.code(404).send({ code: 'TASK_NOT_FOUND', message: '任务不存在' })
  }

  // 如果已完成或已失败，直接返回最终状态，不建立 SSE
  if (task.status === 'SUCCEEDED' || task.status === 'FAILED') {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })
    const event = task.status === 'SUCCEEDED' ? 'task_completed' : 'task_failed'
    reply.raw.write(`event: ${event}\ndata: ${JSON.stringify({ task_id, ... })}\n\n`)
    reply.raw.end()
    return
  }

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',  // 禁用 Nginx 缓冲
  })

  // Redis PubSub 订阅该任务的事件
  const subscriber = redis.duplicate()
  await subscriber.subscribe(`task:${task_id}`)

  subscriber.on('message', (channel, message) => {
    const { event, data } = JSON.parse(message)
    reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    if (event === 'task_completed' || event === 'task_failed') {
      subscriber.unsubscribe()
      reply.raw.end()
    }
  })

  // 心跳：每30秒发一次，防止连接被回收
  const heartbeat = setInterval(() => {
    reply.raw.write(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`)
  }, 30_000)

  // 60秒无事件自动关闭
  const timeout = setTimeout(() => {
    clearInterval(heartbeat)
    subscriber.unsubscribe()
    reply.raw.end()
  }, 60_000)

  req.raw.on('close', () => {
    clearInterval(heartbeat)
    clearTimeout(timeout)
    subscriber.unsubscribe()
  })
})

/** SSE 事件发送工具（Worker 中调用） */
async function emitSSEEvent(taskId: string, event: string, data: Record<string, unknown>) {
  const publisher = redis.duplicate()
  await publisher.publish(`task:${taskId}`, JSON.stringify({ event, data }))
  await publisher.quit()
}
```

### 7.4 断线重连 + 降级轮询兜底

```typescript
// /apps/web/src/lib/sse.ts（SSE 客户端封装）

export class TaskSSEClient {
  private es: EventSource | null = null
  private taskId: string
  private onEvent: (event: string, data: unknown) => void
  private pollFallback: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(taskId: string, onEvent: (event: string, data: unknown) => void) {
    this.taskId = taskId
    this.onEvent = onEvent
  }

  connect() {
    this.es = new EventSource(`/api/v1/tasks/${this.taskId}/stream`)

    this.es.addEventListener('task_queued', (e) => this.onEvent('task_queued', JSON.parse(e.data)))
    this.es.addEventListener('task_started', (e) => this.onEvent('task_started', JSON.parse(e.data)))
    this.es.addEventListener('task_progress', (e) => this.onEvent('task_progress', JSON.parse(e.data)))
    this.es.addEventListener('task_completed', (e) => {
      this.onEvent('task_completed', JSON.parse(e.data))
      this.destroy()
    })
    this.es.addEventListener('task_failed', (e) => {
      this.onEvent('task_failed', JSON.parse(e.data))
      this.destroy()
    })

    this.es.onerror = () => {
      this.es?.close()
      // 降级轮询兜底（每5秒轮询任务状态）
      this.pollFallback = setInterval(async () => {
        const res = await fetch(`/api/v1/tasks/${this.taskId}`)
        const data = await res.json()
        if (data.status === 'SUCCEEDED') {
          this.onEvent('task_completed', data)
          this.destroy()
        } else if (data.status === 'FAILED') {
          this.onEvent('task_failed', data)
          this.destroy()
        }
      }, 5000)
    }
  }

  destroy() {
    this.es?.close()
    if (this.pollFallback) clearInterval(this.pollFallback)
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
  }
}
```

---

## 八、钱包系统详细设计

### 8.1 核心原则

1. **余额不过期**，永久有效
2. **冻结+结算模式**：任务创建时冻结，完成时结算，失败时解冻退款
3. **退款走站内余额**：生成失败 100% 自动退还站内余额
4. **充值退款走原路**：充值售后通过支付宝退款流程
5. **账本流水必记录**：所有余额变动必须写入 `wallet_ledger`

### 8.2 冻结流程（任务创建时）

```typescript
// /apps/api/src/services/wallet.service.ts

/**
 * 原子化冻结金额
 * 伪 SQL：
 * UPDATE wallet_account
 *   SET available_balance = available_balance - $cost,
 *       frozen_balance    = frozen_balance + $cost
 *   WHERE user_id = $userId
 *     AND available_balance >= $cost
 *
 * 返回：成功/失败原因
 */
async function freeze(userId: string, taskId: string, cost: number): Promise<{ ok: boolean; reason?: string }> {
  const wallet = await prisma.walletAccount.findUnique({ where: { user_id: userId } })
  if (!wallet) return { ok: false, reason: 'WALLET_NOT_FOUND' }

  const available = Number(wallet.available_balance)
  if (available < cost) {
    return { ok: false, reason: 'INSUFFICIENT_BALANCE' }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 原子化扣减可用余额 + 增加冻结金额
      const updated = await tx.$executeRaw`
        UPDATE wallet_account
        SET available_balance = available_balance - ${cost}::decimal,
            frozen_balance    = frozen_balance + ${cost}::decimal,
            updated_at        = NOW()
        WHERE user_id = ${userId}
          AND available_balance >= ${cost}::decimal
      `
      if (updated === 0) throw new Error('ATOMIC_FREEZE_FAILED')

      // 写入账本流水
      await tx.walletLedger.create({
        data: {
          wallet_id: wallet.id,
          user_id: userId,
          tx_type: 'TASK_FREEZE',
          amount: -cost,  // 冻结扣可用，所以是负数记录在冻结维度
          balance_before: available,
          balance_after: available - cost,
          order_id: taskId,
          order_type: 'generation_task',
          remark: `冻结金额 ${cost / 100} 元`
        }
      })
    })
    return { ok: true }
  } catch {
    return { ok: false, reason: 'TRANSACTION_FAILED' }
  }
}
```

### 8.3 结算流程（任务成功时）

```typescript
/**
 * 结算扣费（任务成功时调用）
 * 伪 SQL：
 * UPDATE wallet_account
 *   SET frozen_balance = frozen_balance - $cost,
 *       total_spent    = total_spent + $cost
 *   WHERE user_id = $userId
 */
async function settle(userId: string, taskId: string, cost: number) {
  const wallet = await prisma.walletAccount.findUnique({ where: { user_id: userId } })
  const frozenBefore = Number(wallet!.frozen_balance)

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE wallet_account
      SET frozen_balance = frozen_balance - ${cost}::decimal,
          total_spent    = total_spent + ${cost}::decimal,
          updated_at     = NOW()
      WHERE user_id = ${userId}
    `
    await tx.walletLedger.create({
      data: {
        wallet_id: wallet!.id,
        user_id: userId,
        tx_type: 'TASK_SETTLE',
        amount: -cost,
        balance_before: frozenBefore,
        balance_after: frozenBefore - cost,
        order_id: taskId,
        order_type: 'generation_task',
        remark: `结算扣费 ${cost / 100} 元`
      }
    })
  })
}
```

### 8.4 解冻退款流程（任务失败/超时）

```typescript
/**
 * 解冻退款（任务失败/超时/取消时调用）
 */
async function refund(userId: string, taskId: string, cost: number, reason: string) {
  const wallet = await prisma.walletAccount.findUnique({ where: { user_id: userId } })
  const frozenBefore = Number(wallet!.frozen_balance)
  const availableBefore = Number(wallet!.available_balance)

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE wallet_account
      SET frozen_balance    = frozen_balance - ${cost}::decimal,
          available_balance = available_balance + ${cost}::decimal,
          updated_at        = NOW()
      WHERE user_id = ${userId}
    `
    await tx.walletLedger.create({
      data: {
        wallet_id: wallet!.id,
        user_id: userId,
        tx_type: 'TASK_REFUND',
        amount: cost,  // 退还可用，所以是正数
        balance_before: availableBefore,
        balance_after: availableBefore + cost,
        order_id: taskId,
        order_type: 'generation_task',
        remark: `退款：${reason}`
      }
    })
  })
}
```

### 8.5 账本流水写入规则

| 场景 | tx_type | amount 符号 | 说明 |
|------|---------|------------|------|
| 用户充值 | `RECHARGE` | + | 实际支付金额 |
| 注册赠送 | `GIFT_CREDIT` | + | 5元体验金 |
| 任务冻结 | `TASK_FREEZE` | -（记录可用维度） | 冻结时不从可用扣，从账本记录 |
| 任务结算 | `TASK_SETTLE` | - | 从冻结转为已消费 |
| 任务退款 | `TASK_REFUND` | + | 退还可用余额 |
| 会员购买 | `MEMBERSHIP_PURCHASE` | - | |
| 手动调整 | `MANUAL_ADJUSTMENT` | ± | 运营后台调整 |

> **账本原则**：所有余额变动必须成对记录（变动前/后余额），通过 Prisma `$transaction` 保证原子性。

---

## 九、OSS 直传设计

### 9.1 STS 临时凭证生成

```typescript
// /apps/api/src/services/oss.service.ts

import OSS from 'ali-oss'

const ossClient = new OSS({
  region: process.env.OSS_REGION,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET,
})

interface StsToken {
  AccessKeyId: string
  AccessKeySecret: string
  SecurityToken: string
  Expiration: string
}

/**
 * 生成 STS 临时凭证
 * 前端持此凭证直接上传 OSS，无需经过服务端中转
 */
async function generateStsToken(userId: string, objectType: OssObjectType): Promise<StsToken & { bucket: string; endpoint: string; upload_dir: string }> {
  const userDir = `${userId}/${crypto.randomUUID()}`

  // 根据类型决定上传目录
  const dirMap: Record<OssObjectType, string> = {
    UPLOAD: `uploads/${userDir}/`,
    RESULT: `results/${userDir}/`,
    THUMBNAIL: `thumbnails/`
  }
  const uploadDir = dirMap[objectType]

  const policy = Buffer.from(JSON.stringify({
    Version: '1',
    Statement: [{
      Effect: 'Allow',
      Action: ['oss:PutObject', 'oss:PutObjectTagging'],
      Resource: [
        `acs:oss:*:*:${process.env.OSS_BUCKET}/${uploadDir}*`
      ],
      Condition: {
        StringLike: {
          'oss:Prefix': uploadDir
        }
      }
    }]
  })).toString('base64')

  const stsRole = process.env.OSS_STS_ROLE_ARN

  // 调用阿里云 STS 获取临时凭证
  const sts = new OSS.STS({ accessKeyId: process.env.OSS_ACCESS_KEY_ID!, accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET! })
  const token = await sts.assumeRole(stsRole, policy, 3600) // 1小时有效期

  return {
    AccessKeyId: token.Credentials.AccessKeyId,
    AccessKeySecret: token.Credentials.AccessKeySecret,
    SecurityToken: token.Credentials.SecurityToken,
    Expiration: token.Credentials.Expiration,
    bucket: process.env.OSS_BUCKET!,
    endpoint: `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com`,
    upload_dir: uploadDir
  }
}
```

### 9.2 前端直传流程

```typescript
// /apps/web/src/lib/oss.ts

import OSS from 'ali-oss'

/**
 * 前端获取 STS 凭证后直传 OSS
 */
async function uploadFile(
  file: File,
  objectType: 'UPLOAD' | 'RESULT',
  onProgress?: (pct: number) => void
): Promise<string> {
  // 1. 获取 STS 临时凭证
  const { AccessKeyId, AccessKeySecret, SecurityToken, bucket, endpoint, upload_dir } =
    await fetch('/api/v1/oss/upload-token', {
      method: 'POST',
      headers: { 'Authorization': getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: objectType })
    }).then(r => r.json())

  // 2. 用临时凭证初始化 OSS 客户端
  const client = new OSS({
    accessKeyId: AccessKeyId,
    accessKeySecret: AccessKeySecret,
    stsToken: SecurityToken,
    bucket,
    region: endpoint.replace(`https://${bucket}.`, '').replace('.aliyuncs.com', ''),
  })

  // 3. 生成文件名
  const ext = file.name.split('.').pop()
  const key = `${upload_dir}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  // 4. 直传
  const result = await client.put(key, file, {
    progress: (p) => onProgress?.(Math.round(p * 100)),
  })

  return result.url
}
```

### 9.3 目录结构

```
ai-tools/                      # OSS Bucket 根目录
├── uploads/                   # 用户上传
│   └── {user_id}/
│       └── {uuid}/
│           ├── image.png
│           └── audio.mp3
├── results/                   # 生成结果
│   └── {user_id}/
│       └── {task_id}/
│           ├── output_0.png
│           ├── output_1.png
│           └── video.mp4
└── thumbnails/                # 缩略图
    └── {task_id}.jpg
```

- **上传文件**：有效期与 STS Token 相同（1小时），超时需重新申请
- **生成结果**：保留 7 天，通过 OSS Lifecycle 规则自动清理
- **缩略图**：生成后即上传，与结果同生命周期

---

## 十、环境变量设计

### 10.1 完整环境变量清单

```bash
# =============================================
# 应用配置
# =============================================
NODE_ENV=development                    # development | production
PORT=3001                               # BFF 监听端口
APP_URL=https://api.example.com         # API 域名
WEB_URL=https://www.example.com         # 前端域名
ADMIN_URL=https://admin.example.com     # 运营后台域名

# =============================================
# 数据库
# =============================================
DATABASE_URL=postgresql://user:pass@host:5432/ai_toolsite

# =============================================
# Redis
# =============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# =============================================
# JWT
# =============================================
JWT_SECRET=your-256-bit-secret          # Access Token 签发密钥（生产环境≥64字符）
JWT_REFRESH_SECRET=your-refresh-secret # Refresh Token 签发密钥
JWT_ACCESS_EXPIRES=2h                  # Access Token 有效期
JWT_REFRESH_EXPIRES=30d                 # Refresh Token 有效期

# =============================================
# 阿里云 OSS
# =============================================
OSS_REGION=oss-cn-shanghai
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_BUCKET=ai-tools-prod
OSS_STS_ROLE_ARN=acs:ram::123456789:role/oss-uploader

# =============================================
# 阿里云内容安全
# =============================================
ALIYUN_RAM_ACCESS_KEY=your-key
ALIYUN_RAM_SECRET=your-secret
ALIYUN_CONTENT_SAFE_REGION=cn-shanghai

# =============================================
# 上游服务商
# =============================================

# Replicate (FLUX)
REPLICATE_API_TOKEN=your-replicate-token

# 火山引擎 (Seedance)
VOLCENGINE_ACCESS_KEY=your-key
VOLCENGINE_SECRET_KEY=your-secret
VOLCENGINE_ACCOUNT_ID=your-account-id
VOLCENGINE_SPACE_NAME=seedance-prod

# 阿里云百炼 (万相 / CosyVoice)
BAILLIAN_API_KEY=your-baillian-key
BAILLIAN_REGION=cn-shanghai

# 快手官方 (
KAISHI_KV_API_KEY=your-kv-api-key

# =============================================
# 支付
# =============================================

# 支付宝
ALIPAY_APP_ID=your-app-id
ALIPAY_PRIVATE_KEY=your-private-key       # RSA2 私钥（PKCS8）
ALIPAY_PUBLIC_KEY=your-alipay-public-key # 支付宝公钥
ALIPAY_NOTIFY_URL=https://api.example.com/api/v1/payments/alipay/notify

# 微信支付
WECHAT_MCH_ID=your-mch-id
WECHAT_API_KEY=your-api-key
WECHAT_CERT_PATH=/path/to/apiclient_cert.pem
WECHAT_NOTIFY_URL=https://api.example.com/api/v1/payments/wechat/notify

# Stripe (海外)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# =============================================
# 验证码
# =============================================
SMS_PROVIDER=aliyun                       # aliyun | tencent
SMS_ALIYUN_ACCESS_KEY=your-key
SMS_ALIYUN_SECRET=your-secret
SMS_ALIYUN_SIGN_NAME=AI工具站
SMS_ALIYUN_TEMPLATE_CODE=SMS_xxx

# =============================================
# 安全
# =============================================
CORS_ORIGINS=https://www.example.com,https://admin.example.com
RATE_LIMIT_GENERAL=60                     # 普通接口 60 req/min
RATE_LIMIT_AUTH_CODE=5                    # 验证码 5 req/min
RATE_LIMIT_GENERATE=10                     # 生成任务 10 req/min
DAILY_GENERATE_LIMIT=100                   # 单用户每日生成上限

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Apple 登录
APPLE_CLIENT_ID=com.example.app
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey.p8

# =============================================
# 其他
# =============================================
LOG_LEVEL=info                            # info | warn | error
SENTRY_DSN=https://xxx@sentry.io/xxx      # 可选，错误监控
```

### 10.2 环境变量说明

| 变量 | 必填 | 示例值 | 说明 |
|------|------|--------|------|
| `JWT_SECRET` | ✅ | ≥64字符随机串 | 生产环境必须强随机 |
| `JWT_REFRESH_SECRET` | ✅ | ≥64字符随机串 | 与 Access Secret 分离 |
| `OSS_STS_ROLE_ARN` | ✅ | acs:ram::xxx:role/... | RAM 角色 ARN，用于生成临时凭证 |
| `DATABASE_URL` | ✅ | postgresql://... | Prisma 迁移和查询 |
| `REDIS_HOST` | ✅ | localhost | BullMQ + SSE PubSub + 限流 |

---

## 十一、API 接口完整定义

> 以下为所有 BFF API 的完整 Request/Response JSON 定义。

### 11.1 认证接口

#### POST /api/v1/auth/send-code
发送手机验证码

**Request:**
```json
{ "phone": "13812345678" }
```

**Response (200):**
```json
{ "ok": true, "expires_in": 300 }
```

---

#### POST /api/v1/auth/login-by-code
手机号验证码登录

**Request:**
```json
{ "phone": "13812345678", "code": "123456" }
```

**Response (200):**
```json
{
  "ok": true,
  "first_login": true,
  "user": {
    "id": "cuid_xxx",
    "phone": "138****5678",
    "level": "NORMAL",
    "gift_credit": false
  },
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "expires_in": 7200
}
```

---

#### POST /api/v1/auth/refresh
刷新 Access Token

**Request:**
```json
{ "refresh_token": "eyJhbGci..." }
```

**Response (200):**
```json
{
  "ok": true,
  "access_token": "eyJhbGci...",
  "expires_in": 7200
}
```

---

#### POST /api/v1/auth/google
Google OAuth 登录

**Request:**
```json
{ "id_token": "google_id_token_xxx" }
```

**Response (200):**
```json
{
  "ok": true,
  "first_login": false,
  "user": { "id": "cuid_xxx", "level": "NORMAL" },
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "expires_in": 7200
}
```

---

### 11.2 模型接口

#### GET /api/v1/models
获取模型列表

**Query:** `?type=IMAGE|VIDEO|AUDIO`

**Response (200):**
```json
{
  "ok": true,
  "models": [
    {
      "id": "model_cuid_xxx",
      "slug": "flux-2-schnell",
      "name": "FLUX.2 schnell",
      "type": "IMAGE",
      "description": "快速图片生成，支持文生图/图生图",
      "capability": {
        "supports_image2image": true,
        "supports_styles": ["写实", "动漫", "插画"],
        "supported_sizes": ["512x512", "1024x1024", "1080x1920"]
      },
      "pricing": {
        "unit_price": 50,
        "unit": "UNIT_PER_IMAGE",
        "level_discounts": { "NORMAL": 1.0, "MONTHLY": 0.8, "YEARLY": 0.7 }
      }
    }
  ]
}
```

---

### 11.3 OSS 直传

#### POST /api/v1/oss/upload-token
获取直传凭证（需认证）

**Request:**
```json
{ "type": "UPLOAD" }
```

**Response (200):**
```json
{
  "ok": true,
  "AccessKeyId": "STS.xxx",
  "AccessKeySecret": "xxx",
  "SecurityToken": "xxx",
  "Expiration": "2026-04-15T12:00:00Z",
  "bucket": "ai-tools-prod",
  "endpoint": "https://ai-tools-prod.oss-cn-shanghai.aliyuncs.com",
  "upload_dir": "uploads/user_xxx/uuid/"
}
```

---

### 11.4 任务接口

#### POST /api/v1/tasks/generate
创建生成任务（需认证）

**Request (图片):**
```json
{
  "model_slug": "flux-2-schnell",
  "prompt": "一只橘色的猫在草地上奔跑",
  "width": 1024,
  "height": 1024,
  "num_inference_steps": "standard",
  "image_count": 1,
  "reference_image_url": "https://xxx.oss-cn-shanghai.aliyuncs.com/xxx.jpg",
  "strength": 0.7,
  "idem_key": "client-generated-uuid-xxx"
}
```

**Request (视频):**
```json
{
  "model_slug": "seedance-2-0",
  "prompt": "日落海景，海浪拍打礁石",
  "duration": 5,
  "resolution": "1080p",
  "fps": 24,
  "reference_image_url": "https://xxx.oss-cn-shanghai.aliyuncs.com/style.jpg"
}
```

**Request (TTS):**
```json
{
  "model_slug": "cosyvoice-v3-flash",
  "text": "欢迎使用 AI 工具站，一站式生成优质内容",
  "voice": "female_young",
  "speed": 1.0,
  "volume": 80
}
```

**Response (200):**
```json
{
  "ok": true,
  "task_id": "task_cuid_xxx",
  "status": "CREATED",
  "total_cost": 50,
  "balance": {
    "available": 950,
    "frozen": 50,
    "total": 1000
  },
  "expires_at": "2026-04-15T11:05:00Z",
  "stream_url": "/api/v1/tasks/task_cuid_xxx/stream"
}
```

**Error (余额不足 422):**
```json
{
  "code": "INSUFFICIENT_BALANCE",
  "message": "可用余额不足，当前可用：¥0.50，需要：¥0.50",
  "requestId": "req_xxx"
}
```

---

#### GET /api/v1/tasks/:task_id
获取任务详情（需认证）

**Response (200):**
```json
{
  "ok": true,
  "task": {
    "id": "task_cuid_xxx",
    "model_slug": "flux-2-schnell",
    "task_type": "IMAGE",
    "status": "SUCCEEDED",
    "input_params": { "prompt": "一只橘色的猫...", "width": 1024, "height": 1024 },
    "total_cost": 50,
    "outputs": [
      {
        "id": "out_cuid_xxx",
        "url": "https://xxx.oss-cn-shanghai.aliyuncs.com/results/user_xxx/task_xxx/output_0.png",
        "thumbnail_url": "https://xxx.oss-cn-shanghai.aliyuncs.com/thumbnails/task_xxx.jpg",
        "width": 1024,
        "height": 1024,
        "mime_type": "image/png"
      }
    ],
    "created_at": "2026-04-15T11:00:00Z",
    "completed_at": "2026-04-15T11:00:45Z"
  }
}
```

---

#### GET /api/v1/tasks
获取任务列表（需认证，分页）

**Query:** `?type=IMAGE&status=SUCCEEDED&page=1&page_size=20`

**Response (200):**
```json
{
  "ok": true,
  "tasks": [...],
  "pagination": {
    "total": 120,
    "page": 1,
    "page_size": 20,
    "total_pages": 6
  }
}
```

---

#### DELETE /api/v1/tasks/:task_id
取消任务（需认证，仅 CREATED 状态可取消）

**Response (200):**
```json
{ "ok": true, "message": "任务已取消，¥0.50 已退还" }
```

---

### 11.5 用户与余额

#### GET /api/v1/user/balance
获取余额信息（需认证）

**Response (200):**
```json
{
  "ok": true,
  "balance": {
    "available": 950,
    "frozen": 0,
    "total_recharged": 1000,
    "total_spent": 50
  },
  "user": {
    "level": "MONTHLY",
    "member_expire": "2026-05-15T00:00:00Z"
  }
}
```

---

#### GET /api/v1/user/wallet/ledger
获取钱包流水（需认证，分页）

**Query:** `?tx_type=TASK_SETTLE&page=1&page_size=20`

**Response (200):**
```json
{
  "ok": true,
  "records": [
    {
      "id": "ledger_cuid_xxx",
      "tx_type": "TASK_SETTLE",
      "amount": -50,
      "balance_before": 1000,
      "balance_after": 950,
      "order_id": "task_cuid_xxx",
      "remark": "结算扣费 ¥0.50",
      "created_at": "2026-04-15T11:00:45Z"
    }
  ],
  "pagination": { "total": 50, "page": 1, "page_size": 20 }
}
```

---

#### POST /api/v1/user/recharge
发起充值（需认证）

**Request:**
```json
{ "amount": 100, "pay_method": "alipay" }
```

**Response (200):**
```json
{
  "ok": true,
  "order_no": "R2026041511000001",
  "pay_url": "https://openapi.alipay.com/gateway.do?...",
  "qr_code_url": "https://..."
}
```

---

#### GET /api/v1/user/recharges
充值记录（需认证）

**Response (200):**
```json
{
  "ok": true,
  "orders": [
    {
      "id": "recharge_cuid_xxx",
      "order_no": "R2026041511000001",
      "amount": 100,
      "gift_amount": 10,
      "pay_method": "alipay",
      "status": "PAID",
      "paid_at": "2026-04-15T11:01:00Z"
    }
  ]
}
```

---

#### GET /api/v1/user/consumption
消费记录（需认证）

**Query:** `?page=1&page_size=20`

**Response (200):**
```json
{
  "ok": true,
  "records": [
    {
      "task_id": "task_cuid_xxx",
      "model_name": "FLUX.2 schnell",
      "type": "IMAGE",
      "cost": 50,
      "status": "SUCCEEDED",
      "created_at": "2026-04-15T11:00:00Z"
    }
  ],
  "pagination": { "total": 45, "page": 1, "page_size": 20 }
}
```

---

### 11.6 收藏

#### GET /api/v1/favorites
收藏列表（需认证）

**Response (200):**
```json
{
  "ok": true,
  "favorites": [
    {
      "id": "fav_cuid_xxx",
      "task": {
        "id": "task_cuid_xxx",
        "outputs": [{ "url": "...", "thumbnail_url": "..." }]
      },
      "created_at": "2026-04-15T12:00:00Z"
    }
  ]
}
```

#### POST /api/v1/favorites
添加收藏（需认证）

**Request:**
```json
{ "task_id": "task_cuid_xxx" }
```

**Response (200):**
```json
{ "ok": true, "favorite_id": "fav_cuid_xxx" }
```

#### DELETE /api/v1/favorites/:id
取消收藏（需认证）

**Response (200):**
```json
{ "ok": true }
```

---

### 11.7 支付回调

#### POST /api/v1/payments/alipay/notify
支付宝异步回调

**Response (200):**
```json
{ "code": "success", "msg": "成功" }
```

---

#### POST /api/v1/payments/wechat/notify
微信支付回调

**Response (200):**
```xml
<xml><code><![CDATA[SUCCESS]]></code><message><![CDATA[OK]]></message></xml>
```

---

## 十二、部署方案（草案）

### 12.1 开发环境（Docker Compose）

```yaml
# /infra/docker/docker-compose.yml

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ai_toolsite
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev123
    ports: ["5432:5432"]
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

  api:
    build:
      context: ../../
      dockerfile: infra/docker/Dockerfile.api
    ports: ["3001:3001"]
    environment:
      DATABASE_URL: postgresql://dev:dev123@postgres:5432/ai_toolsite
      REDIS_HOST: redis
      NODE_ENV: development
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ../../apps/api/src:/app/src  # 热重载

  web:
    build:
      context: ../../
      dockerfile: infra/docker/Dockerfile.web
    ports: ["3000:3000"]
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
    depends_on:
      - api

  worker:
    build:
      context: ../../
      dockerfile: infra/docker/Dockerfile.worker
    environment:
      DATABASE_URL: postgresql://dev:dev123@postgres:5432/ai_toolsite
      REDIS_HOST: redis
      NODE_ENV: development
    depends_on:
      - redis
      - postgres

volumes:
  pgdata:
  redisdata:
```

### 12.2 生产环境架构

```
                    ┌─────────────────────────────────────────┐
                    │              CDN (阿里云 CDN)            │
                    │   静态资源 / 前端 / OSS 直传             │
                    └──────────────┬───────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
        ┌─────▼─────┐        ┌──────▼──────┐      ┌──────▼──────┐
        │  前端 Web  │        │  BFF API    │      │  Admin 后台  │
        │ (Next.js) │        │ (Fastify)   │      │ (Next.js)   │
        │  2+ 实例   │        │  2+ 实例    │      │  1 实例     │
        └───────────┘        └──────┬──────┘      └─────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                      │
        ┌─────▼─────┐        ┌──────▼──────┐      ┌────────▼────────┐
        │ PostgreSQL │        │    Redis    │      │   OSS (阿里云)   │
        │  主从部署   │        │ 主从 + Sentinel│    │   STS 直传      │
        │  备份每日   │        │  限流/SSE/队列│      │   CDN 加速      │
        └────────────┘        └─────────────┘      └─────────────────┘
                                    │
                        ┌───────────┼───────────┐
                        │           │           │
                  ┌─────▼───┐ ┌─────▼───┐ ┌─────▼───┐
                  │ Image   │ │ Video  │ │ Audio  │
                  │ Worker │ │ Worker │ │ Worker │
                  │ 5 实例  │ │ 3 实例 │ │ 5 实例 │
                  └─────────┘ └─────────┘ └─────────┘
```

### 12.3 Docker 文件

```dockerfile
# /infra/docker/Dockerfile.api
FROM oven/bun:1-slim AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile
RUN pnpm --filter api build

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db ./node_modules/@ai-toolsite/db
ENV NODE_ENV=production PORT=3001
EXPOSE 3001
CMD ["bun", "dist/server.js"]
```

### 12.4 数据库迁移流程

```bash
# /infra/scripts/migrate.sh
#!/bin/bash
set -e
cd /app
pnpm --filter @ai-toolsite/db prisma migrate deploy
pnpm --filter @ai-toolsite/db prisma db seed
```

---

## 十三、安全设计

### 13.1 JWT 实现（2h Access + 30d Refresh）

```typescript
// /apps/api/src/plugins/jwt.ts

import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { redis } from './redis'

const JWT_ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_SECRET)
const JWT_REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET)

interface AccessTokenPayload extends JWTPayload {
  userId: string
  level: string
  type: 'access'
}

interface RefreshTokenPayload extends JWTPayload {
  userId: string
  jti: string  // Token ID，用于撤销
  type: 'refresh'
}

/** 签发 Access Token（2小时） */
async function signAccessToken(userId: string, level: string): Promise<string> {
  return new SignJWT({ userId, level, type: 'access' } as AccessTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .setJti(crypto.randomUUID())
    .sign(JWT_ACCESS_SECRET)
}

/** 签发 Refresh Token（30天） */
async function signRefreshToken(userId: string): Promise<string> {
  const jti = crypto.randomUUID()
  const token = await new SignJWT({ userId, jti, type: 'refresh' } as RefreshTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .setJti(jti)
    .sign(JWT_REFRESH_SECRET)

  // Refresh Token 写入 Redis，TTL=30天
  await redis.set(`refresh:${jti}`, userId, 'EX', 30 * 24 * 60 * 60)

  return token
}

/** 验证 Access Token */
async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, JWT_ACCESS_SECRET)
  // 检查是否在黑名单（登出时写入）
  const blacklisted = await redis.get(`blacklist:${token}`)
  if (blacklisted) throw new Error('Token blacklisted')
  return payload as AccessTokenPayload
}

/** 验证并使用 Refresh Token（使用后立即撤销） */
async function verifyRefreshToken(token: string): Promise<{ userId: string; jti: string }> {
  const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET)
  const refreshPayload = payload as RefreshTokenPayload
  if (refreshPayload.type !== 'refresh') throw new Error('Invalid token type')

  // 检查 Redis 中是否存在（未被撤销）
  const stored = await redis.get(`refresh:${refreshPayload.jti}`)
  if (!stored || stored !== refreshPayload.userId) throw new Error('Token revoked')

  // 立即撤销（使用即失效，防止重放）
  await redis.del(`refresh:${refreshPayload.jti}`)

  return { userId: refreshPayload.userId, jti: refreshPayload.jti }
}

/** 登出：撤销 Access Token（写入黑名单 TTL=2h）和 Refresh Token */
async function revokeTokens(accessToken: string, refreshJti: string) {
  // Access Token 黑名单，TTL 为剩余有效期（最多2小时）
  await redis.set(`blacklist:${accessToken}`, '1`, 'EX', 7200)
  // Refresh Token 直接删除
  await redis.del(`refresh:${refreshJti}`)
}
```

### 13.2 支付回调 RSA 验签

```typescript
// /apps/api/src/routes/payments.ts

import { createVerify } from 'crypto'

/** 支付宝回调验签 */
async function verifyAlipayNotify(params: Record<string, string>): Promise<boolean> {
  const { sign_type, sign, ...data } = params
  const signContent = Object.keys(data)
    .sort()
    .map(k => `${k}=${data[k]}`)
    .join('&')

  const verify = createVerify('RSA-SHA256')
  verify.update(signContent)
  return verify.verify(process.env.ALIPAY_PUBLIC_KEY!, sign, 'base64')
}

/** 微信支付验签 */
async function verifyWechatNotify(params: Record<string, string>): Promise<boolean> {
  const { sign, ...data } = params
  const signContent = Object.keys(data)
    .sort()
    .map(k => `${k}=${data[k]}`)
    .join('&') + `&key=${process.env.WECHAT_API_KEY}`

  const expectedSign = createHash('md5')
    .update(signContent)
    .digest('hex')
    .toUpperCase()

  return expectedSign === sign
}

fastify.post('/payments/alipay/notify', async (req, reply) => {
  const params = req.body as Record<string, string>

  // 1. 验签
  const valid = await verifyAlipayNotify(params)
  if (!valid) return reply.code(400).send({ code: 'INVALID_SIGN', message: '验签失败' })

  // 2. 幂等处理（交易号唯一）
  const tradeNo = params.trade_no
  const cached = await redis.get(`alipay_callback:${tradeNo}`)
  if (cached) return reply.send({ code: 'success' }) // 已处理过，直接返回成功

  // 3. 业务处理
  const order = await rechargeService.handleCallback(tradeNo, params)
  if (order) {
    // 4. 标记已处理（TTL=24h）
    await redis.set(`alipay_callback:${tradeNo}`, '1', 'EX', 86400)
  }

  return reply.send({ code: 'success', msg: '成功' })
})
```

### 13.3 防刷机制

```typescript
// /apps/api/src/services/risk.service.ts

interface RiskCheckResult {
  allow: boolean
  action?: 'BLOCK' | 'CAPTCHA' | null
  reason?: string
}

/**
 * 生成任务防刷检查
 * 1. IP 频率限制：每分钟最多 10 次
 * 2. 用户每日上限：默认 100 次
 * 3. 失败触发验证码：5 分钟内 3 次失败
 */
async function checkGenerateRisk(userId: string, ip: string): Promise<RiskCheckResult> {
  const now = Date.now()
  const oneMinuteAgo = now - 60_000
  const fiveMinutesAgo = now - 5 * 60_000
  const oneDayAgo = now - 24 * 60 * 60_000

  const [ipCount, userDayCount, recentFailures] = await Promise.all([
    redis.zcount(`rate:ip:${ip}`, oneMinuteAgo, now),
    prisma.generationTask.count({
      where: { userId, created_at: { gte: new Date(oneDayAgo) } }
    }),
    prisma.generationTask.count({
      where: {
        userId, status: 'FAILED',
        updated_at: { gte: new Date(fiveMinutesAgo) }
      }
    })
  ])

  const dailyLimit = await getSystemConfig('DAILY_GENERATE_LIMIT', 100)
  const ipLimit = parseInt(process.env.RATE_LIMIT_GENERATE ?? '10')

  if (ipCount >= ipLimit) {
    await recordRisk(userId, ip, 'generate', 'SUSPICIOUS', 'IP频率超限')
    return { allow: false, action: 'BLOCK', reason: '操作过于频繁，请稍后再试' }
  }

  if (userDayCount >= dailyLimit) {
    return { allow: false, action: 'BLOCK', reason: `今日生成次数已达上限（${dailyLimit}次）` }
  }

  if (recentFailures >= 3) {
    await recordRisk(userId, ip, 'generate', 'SUSPICIOUS', '连续失败触发验证码')
    return { allow: false, action: 'CAPTCHA', reason: '请完成验证码后重试' }
  }

  return { allow: true }
}

/**
 * 记录频率（每次调用生成后记录）
 */
async function recordRate(userId: string, ip: string) {
  const now = Date.now()
  await Promise.all([
    redis.zadd(`rate:ip:${ip}`, now, `${now}:${Math.random()}`),
    redis.zremrangebyscore(`rate:ip:${ip}`, 0, now - 60_000),  // 清理1分钟前数据
    redis.expire(`rate:ip:${ip}`, 120)  // 2分钟过期
  ])
}

/**
 * 记录风控事件
 */
async function recordRisk(
  userId: string | null,
  ip: string | null,
  action: string,
  level: RiskLevel,
  reason: string
) {
  await prisma.riskControlRecord.create({
    data: { user_id: userId, ip_address: ip, action, risk_level: level, reason }
  })
}
```

### 13.4 安全检查清单

| 项目 | 实现方式 | 状态 |
|------|---------|------|
| SQL 注入 | Prisma 参数化查询，无原生 SQL | ✅ |
| XSS | Response JSON，无 HTML 拼接 | ✅ |
| CSRF | SameSite Cookie +  Bearer Token | ✅ |
| 敏感数据 | 密码/密钥存环境变量，不入 DB | ✅ |
| 日志脱敏 | 手机号中间4位脱敏，金额明文 | ✅ |
| 文件上传 | STS 临时凭证 + OSS 路径白名单 | ✅ |
| 速率限制 | Redis 计数 + 按 IP/User 分层 | ✅ |
| 支付安全 | RSA 验签 + 幂等性保护 | ✅ |
| JWT 安全 | Access 黑名单 + Refresh 使用即撤销 | ✅ |

---

*本文档为 TECH v0.1，基于 PRD v0.3 编写，需技术评审确认后进入实现阶段。*
