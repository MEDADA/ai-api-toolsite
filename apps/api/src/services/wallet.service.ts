import { prisma } from '@ai-toolsite/db';

export const walletService = {
  async freeze(
    userId: string,
    taskId: string,
    cost: number
  ): Promise<{ ok: boolean; reason?: string; availableBalance?: number }> {
    const wallet = await prisma.walletAccount.findUnique({ where: { user_id: userId } });
    if (!wallet) return { ok: false, reason: 'WALLET_NOT_FOUND' };

    const available = Number(wallet.available_balance);
    if (available < cost) {
      return { ok: false, reason: 'INSUFFICIENT_BALANCE', availableBalance: available };
    }

    try {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.$executeRaw`
          UPDATE wallet_account
          SET available_balance = available_balance - ${cost}::decimal,
              frozen_balance = frozen_balance + ${cost}::decimal,
              updated_at = NOW()
          WHERE user_id = ${userId}
            AND available_balance >= ${cost}::decimal
        `;
        if (updated === 0) throw new Error('ATOMIC_FREEZE_FAILED');

        await tx.walletLedger.create({
          data: {
            wallet_id: wallet.id,
            user_id: userId,
            tx_type: 'TASK_FREEZE',
            amount: -cost,
            balance_before: available,
            balance_after: available - cost,
            order_id: taskId || null,
            order_type: 'generation_task',
            remark: `冻结金额 ${cost / 100} 元`,
          },
        });
      });
      return { ok: true };
    } catch {
      return { ok: false, reason: 'TRANSACTION_FAILED' };
    }
  },

  async settle(userId: string, taskId: string, cost: number): Promise<void> {
    const wallet = await prisma.walletAccount.findUnique({ where: { user_id: userId } });
    if (!wallet) return;

    const frozenBefore = Number(wallet.frozen_balance);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE wallet_account
        SET frozen_balance = frozen_balance - ${cost}::decimal,
            total_spent = total_spent + ${cost}::decimal,
            updated_at = NOW()
        WHERE user_id = ${userId}
      `;
      await tx.walletLedger.create({
        data: {
          wallet_id: wallet.id,
          user_id: userId,
          tx_type: 'TASK_SETTLE',
          amount: -cost,
          balance_before: frozenBefore,
          balance_after: frozenBefore - cost,
          order_id: taskId,
          order_type: 'generation_task',
          remark: `结算扣费 ${cost / 100} 元`,
        },
      });
    });
  },

  async refund(userId: string, taskId: string, cost: number, reason: string): Promise<void> {
    const wallet = await prisma.walletAccount.findUnique({ where: { user_id: userId } });
    if (!wallet) return;

    const frozenBefore = Number(wallet.frozen_balance);
    const availableBefore = Number(wallet.available_balance);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE wallet_account
        SET frozen_balance = frozen_balance - ${cost}::decimal,
            available_balance = available_balance + ${cost}::decimal,
            updated_at = NOW()
        WHERE user_id = ${userId}
      `;
      await tx.walletLedger.create({
        data: {
          wallet_id: wallet.id,
          user_id: userId,
          tx_type: 'TASK_REFUND',
          amount: cost,
          balance_before: availableBefore,
          balance_after: availableBefore + cost,
          order_id: taskId,
          order_type: 'generation_task',
          remark: `退款：${reason}`,
        },
      });
    });
  },

  async getBalance(userId: string) {
    const wallet = await prisma.walletAccount.findUnique({ where: { user_id: userId } });
    if (!wallet) {
      return { available: 0, frozen: 0, total_recharged: 0, total_spent: 0 };
    }
    return {
      available: Number(wallet.available_balance),
      frozen: Number(wallet.frozen_balance),
      total_recharged: Number(wallet.total_recharged),
      total_spent: Number(wallet.total_spent),
    };
  },

  async getLedger(
    userId: string,
    opts: { tx_type?: string; page?: number; page_size?: number }
  ) {
    const page = opts.page ?? 1;
    const pageSize = opts.page_size ?? 20;

    const where = {
      user_id: userId,
      ...(opts.tx_type && { tx_type: opts.tx_type as any }),
    };

    const [total, records] = await Promise.all([
      prisma.walletLedger.count({ where }),
      prisma.walletLedger.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      records: records.map(r => ({
        id: r.id,
        tx_type: r.tx_type,
        amount: Number(r.amount),
        balance_before: Number(r.balance_before),
        balance_after: Number(r.balance_after),
        order_id: r.order_id,
        remark: r.remark,
        created_at: r.created_at.toISOString(),
      })),
      pagination: { total, page, page_size: pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async getConsumption(userId: string, opts: { page?: number; page_size?: number }) {
    const page = opts.page ?? 1;
    const pageSize = opts.page_size ?? 20;

    const [total, tasks] = await Promise.all([
      prisma.generationTask.count({ where: { user_id: userId, status: 'SUCCEEDED' } }),
      prisma.generationTask.findMany({
        where: { user_id: userId, status: 'SUCCEEDED' },
        include: { model: true },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      records: tasks.map(t => ({
        task_id: t.id,
        model_name: t.model.name,
        type: t.task_type,
        cost: Number(t.total_cost),
        status: t.status,
        created_at: t.created_at.toISOString(),
      })),
      pagination: { total, page, page_size: pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async getUserProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });
  },
};
