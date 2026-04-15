import { prisma } from '@ai-toolsite/db';
import { RATE_LIMITS } from '@ai-toolsite/shared';

interface RiskCheckResult {
  allow: boolean;
  action?: 'BLOCK' | 'CAPTCHA' | null;
  reason?: string;
}

export const riskService = {
  async checkGenerateRisk(userId: string, ip: string): Promise<RiskCheckResult> {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const [userDayCount, recentFailures] = await Promise.all([
      prisma.generationTask.count({
        where: { user_id: userId, created_at: { gte: new Date(oneDayAgo) } },
      }),
      prisma.generationTask.count({
        where: {
          user_id: userId,
          status: 'FAILED',
          updated_at: { gte: new Date(oneDayAgo) },
        },
      }),
    ]);

    const dailyLimit = RATE_LIMITS.DAILY_GENERATE;

    if (userDayCount >= dailyLimit) {
      return { allow: false, action: 'BLOCK', reason: `今日生成次数已达上限（${dailyLimit}次）` };
    }

    if (recentFailures >= 5) {
      return { allow: false, action: 'CAPTCHA', reason: '失败次数过多，请完成验证后重试' };
    }

    return { allow: true };
  },

  async recordRisk(
    userId: string | null,
    ip: string | null,
    action: string,
    level: 'SAFE' | 'SUSPICIOUS' | 'BLOCKED',
    reason: string
  ) {
    await prisma.riskControlRecord.create({
      data: {
        user_id: userId,
        ip_address: ip,
        action,
        risk_level: level,
        reason,
      },
    });
  },
};
