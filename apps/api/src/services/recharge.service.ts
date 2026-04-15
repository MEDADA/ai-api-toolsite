import { prisma } from '@ai-toolsite/db';
import { RECHARGE_TIERS } from '@ai-toolsite/shared';
import { generateOrderNo } from '../lib/id.js';

export const rechargeService = {
  async createOrder(
    userId: string,
    amount: number,
    payMethod: string,
    requestId: string
  ): Promise<{ ok: false; code: string; message: string } | { ok: true; data: { order_no: string; pay_url: string; qr_code_url?: string } }> {
    const tier = RECHARGE_TIERS.find(t => t.amount === amount);
    if (!tier) {
      return { ok: false, code: 'INVALID_AMOUNT', message: 'Invalid recharge amount' };
    }

    const order = await prisma.rechargeOrder.create({
      data: {
        user_id: userId,
        order_no: generateOrderNo('R'),
        amount: amount * 100, // 转为分
        gift_amount: tier.gift * 100,
        pay_amount: amount * 100,
        pay_method: payMethod,
        status: 'PENDING',
        expired_at: new Date(Date.now() + 30 * 60 * 1000), // 30分钟
      },
    });

    // TODO: Generate payment URL based on payMethod
    const payUrl = `https://payment.example.com/pay?order_no=${order.order_no}`;

    return {
      ok: true,
      data: {
        order_no: order.order_no,
        pay_url: payUrl,
      },
    };
  },

  async handleAlipayCallback(params: Record<string, string>): Promise<boolean> {
    const tradeNo = params['trade_no'];
    if (!tradeNo) return false;

    const order = await prisma.rechargeOrder.findUnique({ where: { trade_no: tradeNo } });
    if (order) return true; // Already processed

    const orderNo = params['out_trade_no'];
    if (!orderNo) return false;

    const rechargeOrder = await prisma.rechargeOrder.findUnique({ where: { order_no: orderNo } });
    if (!rechargeOrder || rechargeOrder.status !== 'PENDING') return false;
    if (new Date() > rechargeOrder.expired_at) return false;

    // Update wallet
    const wallet = await prisma.walletAccount.findUnique({ where: { user_id: rechargeOrder.user_id } });
    if (!wallet) return false;

    const totalAmount = Number(rechargeOrder.amount) + Number(rechargeOrder.gift_amount);

    await prisma.$transaction(async (tx) => {
      await tx.rechargeOrder.update({
        where: { id: rechargeOrder.id },
        data: {
          status: 'PAID',
          trade_no: tradeNo,
          paid_at: new Date(),
        },
      });
      await tx.walletAccount.update({
        where: { user_id: rechargeOrder.user_id },
        data: {
          available_balance: { increment: totalAmount },
          total_recharged: { increment: Number(rechargeOrder.amount) },
        },
      });
      await tx.walletLedger.create({
        data: {
          wallet_id: wallet.id,
          user_id: rechargeOrder.user_id,
          tx_type: 'RECHARGE',
          amount: totalAmount,
          balance_before: Number(wallet.available_balance),
          balance_after: Number(wallet.available_balance) + totalAmount,
          order_id: rechargeOrder.id,
          order_type: 'recharge_order',
          remark: `充值${Number(rechargeOrder.amount) / 100}元${rechargeOrder.gift_amount > 0 ? `，赠送${Number(rechargeOrder.gift_amount) / 100}元` : ''}`,
        },
      });
    });

    return true;
  },

  async handleWechatCallback(params: Record<string, string>): Promise<boolean> {
    // TODO: Verify wechat sign
    const transactionId = params['transaction_id'];
    if (!transactionId) return false;
    // Similar to alipay logic
    return true;
  },

  async listOrders(userId: string) {
    const orders = await prisma.rechargeOrder.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    return orders.map(o => ({
      id: o.id,
      order_no: o.order_no,
      amount: Number(o.amount),
      gift_amount: Number(o.gift_amount),
      pay_method: o.pay_method,
      status: o.status,
      paid_at: o.paid_at?.toISOString(),
      created_at: o.created_at.toISOString(),
    }));
  },
};
