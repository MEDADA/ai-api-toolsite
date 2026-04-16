-- CreateEnum
CREATE TYPE "UserLevel" AS ENUM ('NORMAL', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "IdentityType" AS ENUM ('PHONE', 'EMAIL', 'GOOGLE', 'APPLE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "WalletTxType" AS ENUM ('RECHARGE', 'GIFT_CREDIT', 'TASK_FREEZE', 'TASK_SETTLE', 'TASK_REFUND', 'MEMBERSHIP_PURCHASE', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "RechargeStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDING', 'REFUNDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'TTS', 'ASR', 'VOICE_CLONE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('CREATED', 'QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ModelType" AS ENUM ('IMAGE', 'VIDEO', 'TTS', 'ASR', 'VOICE_CLONE');

-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('REPLICATE', 'FAL_AI', 'ALIYUN_BAILIAN', 'VOLCENGINE', 'KAISHI_KV', 'OPENAI_PROXY');

-- CreateEnum
CREATE TYPE "ChannelStatus" AS ENUM ('ACTIVE', 'RATE_LIMITED', 'DISABLED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PASSED', 'BLOCKED', 'PENDING', 'ERROR');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('SAFE', 'SUSPICIOUS', 'BLOCKED');

-- CreateEnum
CREATE TYPE "OssObjectType" AS ENUM ('UPLOAD', 'RESULT', 'THUMBNAIL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "nickname" TEXT,
    "avatar" TEXT,
    "level" "UserLevel" NOT NULL DEFAULT 'NORMAL',
    "gift_credit" BOOLEAN NOT NULL DEFAULT false,
    "member_expire" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_identity" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "IdentityType" NOT NULL,
    "identifier" TEXT NOT NULL,
    "oauth_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_identity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_session" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "device_info" TEXT,
    "ip_address" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "user_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_account" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "available_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "frozen_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_recharged" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_spent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_ledger" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tx_type" "WalletTxType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balance_before" DECIMAL(10,2) NOT NULL,
    "balance_after" DECIMAL(10,2) NOT NULL,
    "order_id" TEXT,
    "order_type" TEXT,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recharge_order" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_no" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "gift_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pay_amount" DECIMAL(10,2) NOT NULL,
    "pay_method" TEXT NOT NULL,
    "trade_no" TEXT,
    "status" "RechargeStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3) NOT NULL,
    "refund_amount" DECIMAL(10,2),
    "refund_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recharge_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_order" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_no" TEXT NOT NULL,
    "level" "UserLevel" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "pay_method" TEXT NOT NULL,
    "trade_no" TEXT,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ModelType" NOT NULL,
    "provider" "ProviderType" NOT NULL,
    "channel_id" TEXT,
    "description" TEXT,
    "capability" JSONB NOT NULL,
    "config" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_pricing" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "level" "UserLevel" NOT NULL DEFAULT 'NORMAL',
    "unit_price" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "min_quantity" INTEGER NOT NULL DEFAULT 1,
    "max_quantity" INTEGER,
    "discount" DECIMAL(5,4),
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_task" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "task_type" "TaskType" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'CREATED',
    "idem_key" TEXT,
    "input_params" JSONB NOT NULL,
    "cost_snapshot" DECIMAL(10,2) NOT NULL,
    "total_cost" DECIMAL(10,2) NOT NULL,
    "upstream_job_id" TEXT,
    "provider_channel_id" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "queued_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generation_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_output" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_output_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_event" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "detail" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_asset" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "OssObjectType" NOT NULL,
    "oss_key" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "task_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "task_id" TEXT,
    "asset_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_channel" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "provider" "ProviderType" NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "status" "ChannelStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "rate_limit" INTEGER,
    "rate_used" INTEGER NOT NULL DEFAULT 0,
    "rate_reset_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_request_log" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "task_id" TEXT,
    "upstream_job_id" TEXT,
    "request" JSONB NOT NULL,
    "response" JSONB,
    "status_code" INTEGER,
    "duration_ms" INTEGER,
    "cost" DECIMAL(10,4),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_request_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_review_record" (
    "id" TEXT NOT NULL,
    "task_id" TEXT,
    "asset_id" TEXT,
    "content_url" TEXT,
    "content_type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "passed_at" TIMESTAMP(3),
    "blocked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_review_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_record" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "idem_key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_control_record" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "ip_address" TEXT,
    "action" TEXT NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "reason" TEXT,
    "detail" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_control_record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "user_identity_user_id_idx" ON "user_identity"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_identity_type_identifier_key" ON "user_identity"("type", "identifier");

-- CreateIndex
CREATE UNIQUE INDEX "user_session_refresh_token_key" ON "user_session"("refresh_token");

-- CreateIndex
CREATE INDEX "user_session_user_id_idx" ON "user_session"("user_id");

-- CreateIndex
CREATE INDEX "user_session_expires_at_idx" ON "user_session"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_account_user_id_key" ON "wallet_account"("user_id");

-- CreateIndex
CREATE INDEX "wallet_ledger_user_id_created_at_idx" ON "wallet_ledger"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "wallet_ledger_wallet_id_idx" ON "wallet_ledger"("wallet_id");

-- CreateIndex
CREATE INDEX "wallet_ledger_order_id_idx" ON "wallet_ledger"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "recharge_order_order_no_key" ON "recharge_order"("order_no");

-- CreateIndex
CREATE INDEX "recharge_order_user_id_idx" ON "recharge_order"("user_id");

-- CreateIndex
CREATE INDEX "recharge_order_status_idx" ON "recharge_order"("status");

-- CreateIndex
CREATE INDEX "recharge_order_created_at_idx" ON "recharge_order"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "membership_order_order_no_key" ON "membership_order"("order_no");

-- CreateIndex
CREATE INDEX "membership_order_user_id_idx" ON "membership_order"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "model_slug_key" ON "model"("slug");

-- CreateIndex
CREATE INDEX "model_type_idx" ON "model"("type");

-- CreateIndex
CREATE INDEX "model_is_active_idx" ON "model"("is_active");

-- CreateIndex
CREATE INDEX "model_pricing_model_id_level_idx" ON "model_pricing"("model_id", "level");

-- CreateIndex
CREATE INDEX "generation_task_user_id_created_at_idx" ON "generation_task"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "generation_task_status_created_at_idx" ON "generation_task"("status", "created_at");

-- CreateIndex
CREATE INDEX "generation_task_user_id_status_idx" ON "generation_task"("user_id", "status");

-- CreateIndex
CREATE INDEX "generation_task_upstream_job_id_idx" ON "generation_task"("upstream_job_id");

-- CreateIndex
CREATE INDEX "generation_task_idem_key_idx" ON "generation_task"("idem_key");

-- CreateIndex
CREATE INDEX "generation_output_task_id_idx" ON "generation_output"("task_id");

-- CreateIndex
CREATE INDEX "generation_event_task_id_idx" ON "generation_event"("task_id");

-- CreateIndex
CREATE INDEX "user_asset_user_id_type_idx" ON "user_asset"("user_id", "type");

-- CreateIndex
CREATE INDEX "favorite_user_id_idx" ON "favorite"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_user_id_task_id_key" ON "favorite"("user_id", "task_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_user_id_asset_id_key" ON "favorite"("user_id", "asset_id");

-- CreateIndex
CREATE INDEX "provider_channel_model_id_status_idx" ON "provider_channel"("model_id", "status");

-- CreateIndex
CREATE INDEX "provider_request_log_channel_id_created_at_idx" ON "provider_request_log"("channel_id", "created_at");

-- CreateIndex
CREATE INDEX "provider_request_log_task_id_idx" ON "provider_request_log"("task_id");

-- CreateIndex
CREATE INDEX "content_review_record_task_id_idx" ON "content_review_record"("task_id");

-- CreateIndex
CREATE INDEX "content_review_record_status_idx" ON "content_review_record"("status");

-- CreateIndex
CREATE INDEX "idempotency_record_user_id_idem_key_idx" ON "idempotency_record"("user_id", "idem_key");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_record_user_id_idem_key_key" ON "idempotency_record"("user_id", "idem_key");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- CreateIndex
CREATE INDEX "risk_control_record_user_id_action_idx" ON "risk_control_record"("user_id", "action");

-- CreateIndex
CREATE INDEX "risk_control_record_ip_address_idx" ON "risk_control_record"("ip_address");

-- AddForeignKey
ALTER TABLE "user_identity" ADD CONSTRAINT "user_identity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_session" ADD CONSTRAINT "user_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_account" ADD CONSTRAINT "wallet_account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallet_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recharge_order" ADD CONSTRAINT "recharge_order_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_order" ADD CONSTRAINT "membership_order_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_pricing" ADD CONSTRAINT "model_pricing_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_task" ADD CONSTRAINT "generation_task_provider_channel_id_fkey" FOREIGN KEY ("provider_channel_id") REFERENCES "provider_channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_task" ADD CONSTRAINT "generation_task_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_task" ADD CONSTRAINT "generation_task_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_output" ADD CONSTRAINT "generation_output_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "generation_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_event" ADD CONSTRAINT "generation_event_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "generation_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_asset" ADD CONSTRAINT "user_asset_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_request_log" ADD CONSTRAINT "provider_request_log_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "provider_channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
