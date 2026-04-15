# PRD v0.1 — AI 在线生成工具站

**版本**：v0.3
**创建日期**：2026-04-15
**修订日期**：2026-04-15
**状态：** 🟡 待用户评审确认
**负责人**：DevPM

> v0.3 修订（对齐 TECH v0.1）：
> - 余额模型改为钱包+账本流水（冻结/结算/退款/赠送金）
> - 扣费改为冻结+结算模式（下单冻结，完成结算，失败解冻）
> - JWT 改为 2h Access + 30d Refresh
> - 退款：生成失败退站内余额；充值售后才走原路
> - 重新生成正常计费

---

## 一、产品概述

### 1.1 一句话定位

面向普通用户的 AI 在线生成工具站，无需 API Key，无需技术背景，选择模型 → 输入需求 → 点生成 → 下载结果，按次收费。

### 1.2 产品愿景

让任何一个内容创作者、电商卖家、自媒体博主，都能在一分钟内生成专业级图片/视频/音频，无需任何技术背景。

### 1.3 核心价值主张

| 维度 | 现有方案 | 我们的平台 |
|------|---------|-----------|
| **门槛** | 需要 API Key、充值大额余额 | 1元起充，按次计费 |
| **操作** | 读文档、调接口 | 选模型→写需求→点生成 |
| **速度** | 排队等待 | 承诺无队列，SSE 实时进度 |
| **体验** | 土味后台 | 10年前端经验降维打击 |

### 1.4 目标用户

**主要用户画像：**
- **内容创作者**：需要配图、短视频，配音旁白
- **电商卖家**：产品图、主图视频、宣传音频
- **自媒体博主**：封面图、背景音乐、解说配音
- **中小企业**：宣传物料，无需外包设计

**用户特征：**
- 无编程能力，不懂 API
- 有明确创作需求，愿意为便捷付溢价
- 付费决策快（10-50元区间），但要求结果直观

---

## 二、页面结构

### 2.1 页面地图

```
首页
├── 图片生成页
│   └── 模型选择 → 参数配置 → 生成 → 结果页
├── 视频生成页
│   └── 模型选择 → 参数配置 → 生成 → 结果页
├── 语音生成页
│   ├── TTS（文字转语音）
│   ├── ASR（语音转文字）
│   └── 声音克隆
└── 用户后台
    ├── 余额充值
    ├── 消费记录
    ├── 会员中心
    ├── 生成历史
    └── 收藏夹
```

### 2.2 首页设计要求

**核心要素（首屏必须看到）：**
1. 三类生成入口：大图/视频/语音卡片式展示，带图标和价格区间
2. 快速开始区：「立即体验」按钮，无需登录
3. 热门模型展示区（4-6个爆款模型）
4. 底部：登录/注册入口

---

## 三、核心功能详细定义

### 3.1 用户注册与登录

**支持方式：**
- 手机号 + 验证码登录（国内）
- 邮箱 + 密码登录（海外）
- Google 账号登录（一键）
- Apple 登录（一键）

**用户首次登录默认行为：**
- 赠送 5 元体验金（可生成 3-5 张图片或 3 秒视频）
- 引导完成首次生成（留存关键）

**Session 管理：**
- JWT Access Token，有效期 2 小时
- Refresh Token 30 天，自动续期

### 3.2 图片生成模块

**页面流程：**
```
选择模型 → 输入描述 → 上传参考图（图生图模式，可选）→ 调整参数（可选）→ 确认价格 → 扣费生成 → SSE进度 → 完成展示 → 下载
```

> **两种生成模式：**
> - **文生图**（默认）：纯文字描述生成图片
> - **图生图**（可选）：上传参考图，AI 基于参考图生成（可调相似度/强度）

**模型配置：**

| 模型 | 接口 | 文生图 | 图生图 | 零售价 | 成本估算 |
|------|------|--------|--------|--------|---------|
| FLUX.2 schnell | Replicate/fal.ai | ✅ | ✅ | ¥0.5/张 | ~¥0.15 |
| FLUX.2 dev | Replicate | ✅ | ✅ | ¥1.2/张 | ~¥0.40 |
| Kling O3 Image | 官方API | ✅ | ✅ | ¥1.0/张 | ~¥0.25 |
| 万相 2.6 | 阿里云百炼 | ✅ | ✅ | ¥0.5/张 | ~¥0.10 |

> **注：** 价格已设为保本价（成本 × 3-5 倍），后续可在管理后台实时调整。

**图生图参数说明：**
- `reference_image_url`：参考图 URL（直传 OSS，必填）
- `strength`：相似度强度 0.0-1.0（默认 0.7，越低越接近参考图）
- `prompt`：可留空（纯图生图）或补充描述

**参数说明：**
- `prompt`：必填，中文描述（限制 2000 字符）
- `width/height`：图片尺寸，支持 512×512、1024×1024、1080×1920（竖版）等
- `style`：可选风格（写实、动漫、插画等，按模型支持情况）
- `num_inference_steps`：可选，质量档位（快速/标准/高质量）
- `image_count`：可选，张数（1-4，默认1）

### 3.3 视频生成模块

**页面流程：**
```
选择模型 → 选择时长（3/5/10/15秒）→ 输入描述 → 上传参考图（可选）→ 确认价格 → 扣费生成 → SSE实时进度 → 完成展示 → 下载
```

**模型配置：**

| 模型 | 接口 | 参数 | 零售价 | 成本估算 |
|------|------|------|--------|---------|
| Seedance 2.0 | 火山引擎 | prompt, duration, resolution, fps, reference_image_url | ¥3.0/秒 | ~¥1.5/秒 |
| Seedance 1.5 | 火山引擎 | prompt, duration, resolution | ¥1.5/秒 | ~¥0.7/秒 |
| Kling 3.0 | 快手官方API | prompt, duration, aspect_ratio, camera_control | ¥3.0/秒 | ~¥1.2/秒 |

> **注：** 视频定价已设为保本价（按 1080p/5秒估算）。Seedance 2.0 火山引擎按 token 计费，实际成本随分辨率/时长浮动，**Phase 1 先按「时长×单价」估算，后续按实际账单配置精确计费**。

**参数说明：**
- `duration`：3 / 5 / 10 / 15 秒
- `resolution`：540p / 720p / 1080p（Seedance 2.0 支持 4K）
- `reference_image_url`：可选，参考图用于风格控制
- `camera_control`：可选，运镜控制参数（Kling 专属）
- `prompt`：必填，限制 500 字符

**异步任务设计：**
- 用户提交 → 立即返回 task_id 和预计时间
- 任务入 BullMQ 队列
- SSE 每 5 秒推送进度（pending / processing / completed / failed）
- 超时时间：5 分钟（超时自动标记失败，自动退款）
- 生成完成后文件存 OSS，保留 7 天

### 3.4 语音生成模块

#### 3.4.1 TTS（文字转语音）

| 模型 | 接口 | 参数 | 零售价 | 成本估算 |
|------|------|------|--------|---------|
| CosyVoice V3-Flash | 阿里云百炼 | text, voice, speed, volume | ¥0.3/千字符 | ~¥0.05/千字符 |

**参数说明：**
- `text`：必填，限制 5000 字符
- `voice`：可选音色（男声/女声/童声等，预设 10 种）
- `speed`：语速 0.5-2.0，默认 1.0
- `volume`：音量 0-100，默认 80

#### 3.4.2 ASR（语音转文字）

| 模型 | 接口 | 参数 | 零售价 | 成本估算 |
|------|------|------|--------|---------|
| FunASR | 阿里云 | audio_url, language | ¥0.5/分钟 | ~¥0.10/分钟 |
| Whisper | OpenAI 中转 | audio_url, language | ¥0.5/分钟 | ~¥0.15/分钟 |

**参数说明：**
- `audio_url`：上传音频 URL（直传 OSS）
- `language`：自动检测 / 中文 / 英文

#### 3.4.3 声音克隆

| 模型 | 接口 | 参数 | 零售价 | 成本估算 |
|------|------|------|--------|---------|
| CosyVoice 声音复刻 | 阿里云百炼 | source_audio_url, target_text | ¥2.0/次 | ~¥0.5/次 |

**参数说明：**
- `source_audio_url`：参考音频（需 10-60 秒，含清晰人声）
- `target_text`：要克隆音色说的文本（限制 500 字）

### 3.5 用户后台

#### 3.5.1 钱包系统（冻结+结算模式）

**核心原则：**
- 余额不过期（永久有效）
- 生成任务创建时冻结金额，完成时结算，失败时解冻退款
- 退款规则：生成失败 100% 自动退还站内余额
- 充值退款：走支付宝退款流程
- 余额显示精确到分（¥0.01）

**钱包账户：**
- `available_balance`：可用余额
- `frozen_balance`：冻结中金额

**账本流水（所有余额变动必须记录）：**
- 充值（recharge）
- 赠送金（gift_credit）
- 任务冻结（task_freeze）
- 任务结算（task_capture）
- 任务退款（task_refund）
- 会员购买（membership_purchase）
- 手动调整（manual_adjustment）

#### 3.5.2 充值系统

**充值档位：**

| 档位 | 到账金额 | 赠送 | 实际单价 |
|------|---------|------|---------|
| ¥10 | ¥10 | 0 | ¥10 |
| ¥50 | ¥50 | ¥2 | ¥9.6 |
| ¥100 | ¥100 | ¥10 | ¥9.1 |
| ¥500 | ¥500 | ¥100 | ¥8.3 |
| ¥1000 | ¥1000 | ¥250 | ¥8.0 |

**支付方式：**
- 国内：支付宝（主）/ 微信支付
- 海外：Stripe（信用卡）/ PayPal

**充值到账：** 实时到账（支付成功即更新余额）

#### 3.5.3 会员体系

| 等级 | 门槛 | 折扣 | 权益 |
|------|------|------|------|
| 普通 | 无 | 无 | 全价使用 |
| 月卡 | ¥29/月 | 图片8折/视频9折 | 月内无限次折扣 |
| 年卡 | ¥199/年 | 图片7折/视频8折 | 年内无限次折扣 |

#### 3.5.4 消费记录

支持按时间/类型/模型筛选，保留 90 天。

#### 3.5.5 生成历史与收藏

- 历史记录自动保存（含预览图/视频链接）
- 收藏夹支持收藏/取消收藏
- 每个用户最多保存 500 条历史

---

## 四、数据模型

### 4.1 核心实体（20张表）

```
users              — 用户基本信息
user_identity      — 多登录方式绑定
user_session       — 会话管理（Refresh Token）
wallet_account     — 钱包账户（available + frozen balance）
wallet_ledger      — 账本流水（所有余额变动记录）
recharge_order     — 充值订单
membership_order   — 会员订单
model              — 模型定义
model_pricing      — 模型定价（可配置，按区域/用户等级/时间）
generation_task    — 生成任务（核心）
generation_output  — 任务产出（一对多）
generation_event   — 任务事件日志
user_asset         — 用户上传文件
favorite           — 收藏
provider_channel   — 上游渠道（多渠道支持）
provider_request_log — 上游调用日志
content_review_record — 内容审核记录
idempotency_record  — 幂等记录
system_config       — 系统配置
risk_control_record — 风控记录
```

### 4.2 关键索引

- `generation_task(user_id, created_at)` — 用户历史查询
- `generation_task(status, created_at)` — 后台任务状态查询
- `idempotency_record(user_id, idem_key)` — 幂等校验
- `wallet_ledger(user_id, created_at)` — 流水查询

---

## 五、BFF 层 API 草案

### 5.1 认证

所有需要登录的接口 Header：
```
Authorization: Bearer <jwt_access_token>
```

#### POST /api/v1/auth/send-code — 发送手机验证码
#### POST /api/v1/auth/login-by-code — 手机号验证码登录（返回 Access + Refresh Token + first_login）
#### POST /api/v1/auth/refresh — 刷新 Access Token
#### POST /api/v1/auth/google — Google OAuth 登录

### 5.2 公开接口

#### GET /api/v1/models — 获取模型列表（支持 type 筛选）
#### POST /api/v1/oss/upload-token — 获取直传 OSS STS 临时凭证

### 5.3 生成任务

#### POST /api/v1/tasks/generate — 创建生成任务（立即冻结金额，返回 task_id）
#### GET /api/v1/tasks/:task_id — 获取任务详情
#### GET /api/v1/tasks — 获取任务列表（分页，筛选 type/status）
#### GET /api/v1/tasks/:task_id/stream — SSE 实时进度推送

### 5.4 用户与余额

#### GET /api/v1/user/profile — 个人资料
#### GET /api/v1/user/balance — 余额信息（available + frozen + member_level）
#### GET /api/v1/user/wallet/ledger — 钱包流水记录
#### POST /api/v1/user/recharge — 发起充值（返回支付链接）
#### GET /api/v1/user/recharges — 充值记录
#### GET /api/v1/user/consumption — 消费记录

### 5.5 支付回调

#### POST /api/v1/payments/alipay/notify — 支付宝异步回调
#### POST /api/v1/payments/wechat/notify — 微信支付回调

---

## 六、技术架构

### 6.1 项目结构

```
ai-api-toolsite/
├── apps/
│   ├── web/               # Next.js 前端
│   │   ├── app/
│   │   │   ├── (auth)/    # 登录/注册
│   │   │   ├── (main)/    # 主站页面
│   │   │   ├── api/       # 同前端 SSR API
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/
│   ├── api/               # BFF 层（Node.js/Bun + Fastify）
│   │   ├── src/
│   │   │   ├── routes/    # 路由
│   │   │   ├── services/  # 业务逻辑
│   │   │   ├── adapters/  # 模型 API 适配器
│   │   │   ├── jobs/      # BullMQ 消费者
│   │   │   └── middleware/
│   ├── worker/            # 独立 Worker 进程（任务执行）
│   └── admin/             # 运营后台（Next.js）
├── packages/
│   ├── db/                # PostgreSQL Schema + Prisma Client
│   ├── shared/            # 前后端共用 types、constants、schemas
│   └── config/            # ESLint、TSConfig 等
├── infra/
│   ├── docker/
│   ├── terraform/
│   └── scripts/
├── docs/
└── README.md
```

### 6.2 BFF 适配器设计

每个模型有自己的 adapter，统一接口：

```typescript
interface ModelAdapter {
  readonly slug: string;
  readonly type: 'image' | 'video' | 'audio';
  validate(params: unknown): ValidationResult;
  toUpstream(params: ValidatedParams): UpstreamRequest;
  parseResponse(res: UpstreamResponse): ParsedResult;
  estimateCost(params: ValidatedParams): number; // 返回分
}
```

### 6.3 BullMQ 任务设计

**Queue 名称：** `image-generation`、`video-generation`、`audio-generation`

**Worker 流程：**
```
获取 Job → 原子化冻结金额
     ↓ 成功
调用上游 API（adapter.toUpstream()）
     ↓
轮询上游 job 状态（或等待 callback）
     ↓ 完成
下载结果 → 上传 OSS
     ↓
结算扣费 → 更新 task.status = succeeded
     ↓ 失败
解冻退款 → task.status = failed
```

**失败处理：** 上游 API 失败或超时（5分钟）→ 自动退款 + 重试2次

### 6.4 SSE 实时推送

**事件格式：** task_queued → task_started → (task_progress × N) → task_completed / task_failed

**断线重连：** 前端每 30 秒心跳，超时 60 秒自动重连；降级兜底轮询

### 6.5 直传 OSS 设计

前端通过 `/api/v1/oss/upload-token` 获取 STS 临时凭证，直传 OSS，拿到 file_url 再调用生成接口。

**OSS 目录结构：**
```
ai-tools/
├── uploads/{user_id}/     # 用户上传
├── results/{user_id}/{task_id}/  # 生成结果
└── thumbnails/{task_id}.jpg  # 缩略图
```

---

## 七、页面详细流程

### 7.1 图片生成页

Step 1 选择模型 → Step 2 输入 prompt + 上传参考图（图生图可选）→ Step 3 确认价格 → Step 4 扣费生成 → Step 5 SSE 进度 → Step 6 完成展示/下载

### 7.2 视频生成页

Step 1 选择模型 → Step 2 选时长 + 输入 prompt + 上传参考图 → Step 3 确认价格 → Step 4 扣费生成 → Step 5 SSE 进度 → Step 6 完成展示/下载

### 7.3 语音生成页

三个 Tab：TTS / ASR / 声音克隆
- TTS：文字 → 选音色 → 生成 → 下载
- ASR：上传音频 → 转写 → 复制/下载
- 克隆：上传参考音频 → 输入文本 → 生成 → 下载

---

## 八、运营功能

### 8.1 新用户引导
- 首次注册 → 弹窗「送你 5 元体验金」
- 引导完成第一次生成
- 生成完成 → 引导充值第一档（¥10）

### 8.2 敏感内容过滤
- Prompt 关键词本地过滤 + 阿里云内容安全 API 双重审核
- 生成结果二次审核，违规自动删除

### 8.3 防刷机制
- 单 IP 频率限制（每分钟最多 10 次生成）
- 滑动验证码：5 分钟内超过 5 次失败触发
- 单用户单日生成上限（可配置，默认 100 次）

---

## 九、开发阶段与里程碑

### Phase 1 — MVP（Week 1-4）

| 里程碑 | 内容 |
|--------|------|
| M1.1 | 基础框架搭建（Next.js + Fastify + PostgreSQL + Redis）|
| M1.2 | 用户注册/登录 + JWT + 体验金 + 钱包系统 |
| M1.3 | 图片生成模块（FLUX.2 schnell + 万相 2.6）文生图+图生图 |
| M1.4 | OSS 直传 + 余额冻结/结算 + 退款逻辑 |
| M1.5 | 视频生成模块（Seedance 2.0）+ BullMQ + SSE |
| M1.6 | TTS 模块（CosyVoice）|
| M1.7 | 充值系统（支付宝）+ 消费记录 |
| M1.8 | 用户后台（余额/历史/收藏）|
| M1.9 | 内部测试 + Bug 修复 |

### Phase 2 — 完善（Week 5-8）
ASR / 声音克隆 / Kling 3.0 / 会员体系 / Stripe

### Phase 3 — 增长（Week 9-12）
批量生成 / 高清修复 / 多语言 / 团队协作

---

## 十、外部依赖

| 依赖方 | 用途 | 风险 |
|--------|------|------|
| 火山引擎（Seedance）| 视频生成 | 🔴 高 |
| 阿里云百炼（万相/CosyVoice）| 图片/语音 | 🟡 中 |
| Replicate（FLUX.2）| 图片生成 | 🟡 中 |
| 阿里云 OSS | 存储 | 🟢 低 |
| 阿里云内容安全 | 审核 | 🟢 低 |

---

## 十一、已确认事项

| # | 事项 | 决策 |
|---|------|------|
| ✅ | Seedance 2.0 中转合规性 | 确认可接入（火山引擎自用账户）|
| ✅ | 火山引擎最低充值门槛 | 自用账户解决 |
| ✅ | 目标市场 | 专注国内，支付宝为主 |
| ✅ | 体验金金额 | 5元合适 |
| ✅ | 文件存储期限 | 7天够用 |
| ✅ | 退款政策 | 走支付宝退款流程 |

---

## 十二、定价系统（可配置）

价格不硬编码，全部入库可配置，支持后台实时调整。

| 模型类型 | 定价策略 | 毛利率目标 |
|---------|---------|-----------|
| 图片（FLUX/万相）| 成本 × 3-5 倍 | 60-75% |
| 视频（Seedance/Kling）| 成本 × 2 倍 | 50% |
| 语音（TTS/ASR）| 成本 × 5-6 倍 | 70-80% |
| 声音克隆 | 成本 × 4 倍 | 75% |

---

*本文档为 PRD v0.3，需用户评审确认后方可进入 TECH 阶段。*
