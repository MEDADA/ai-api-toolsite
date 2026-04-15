import { createHmac, createSign } from 'crypto';
import { prisma } from '@ai-toolsite/db';
import { RECHARGE_TIERS } from '@ai-toolsite/shared';
import { generateOrderNo } from '../lib/id.js';
import { env } from '../config/env.js';
import { walletService } from './wallet.service.js';

/**
 * Build Alipay payment URL (web checkout URL).
 * For sandbox, use https://openapi-sandbox.dl.alipaydev.com/gateway.do
 * For production, use https://openapi.alipay.com/gateway.do
 */
function buildAlipayUrl(params: Record<string, string>): string {
  const baseUrl = env.NODE_ENV === 'production'
    ? 'https://openapi.alipay.com/gateway.do'
    : 'https://openapi-sandbox.dl.alipaydev.com/gateway.do';

  const query = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  return `${baseUrl}?${query}`;
}

/**
 * Sign Alipay params using RSA2 with private key.
 */
function signAlipayParams(params: Record<string, string>): string {
  const signType = 'RSA2';
  const privateKey = env.ALIPAY_PRIVATE_KEY ?? '';

  // Build string to sign (sorted key=value joined by &)
  const signContent = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');

  const sign = createSign('RSA-SHA256');
  sign.update(signContent);
  return sign.sign(privateKey, 'base64');
}

/**
 * Verify Alipay callback signature.
 */
export function verifyAlipaySign(params: Record<string, string>): boolean {
  const { sign, sign_type, ...data } = params;
  if (!sign) return false;

  const signContent = Object.keys(data)
    .sort()
    .map(k => `${k}=${decodeURIComponent(String(data[k]))}`)
    .join('&');

  const verify = createSign('RSA-SHA256');
  verify.update(signContent);
  return verify.verify(env.ALIPAY_PUBLIC_KEY ?? '', sign, 'base64');
}

export const rechargeService = {
  /**
   * Create a recharge order and generate payment URL.
   */
  async createOrder(
    userId: string,
    amount: number,
    payMethod: string,
    requestId: string
  ): Promise<{ ok: false; code: string; message: string } | { ok: true; data: { order_no: string; pay_url: string; qr_code_url?: string } }> {
    // Validate amount against tiers
    const tier = RECHARGE_TIERS.find(t => t.amount === amount);
    if (!tier) {
      return { ok: false, code: 'INVALID_AMOUNT', message: `Invalid recharge amount: ¥${amount}. Valid tiers: ${RECHARGE_TIERS.map(t => t.amount).join(', ')}` };
    }

    // Validate pay method
    if (!['alipay', 'wechat', 'stripe', 'paypal'].includes(payMethod)) {
      return { ok: false, code: 'INVALID_PAY_METHOD', message: 'Invalid payment method' };
    }

    const order = await prisma.rechargeOrder.create({
      data: {
        user_id: userId,
        order_no: generateOrderNo('R'),
        amount: amount * 100, // 元 → 分
        gift_amount: tier.gift * 100,
        pay_amount: amount * 100,
        pay_method: payMethod,
        status: 'PENDING',
        expired_at: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      },
    });

    let payUrl = '';

    if (payMethod === 'alipay') {
      // Build Alipay web checkout URL
      const bizContent = JSON.stringify({
        out_trade_no: order.order_no,
        product_code: 'FAST_INSTANT_TRADE_PAY',
        total_amount: amount.toFixed(2),
        subject: `AI工具站充值 ¥${amount}${tier.gift > 0 ? `（赠送 ¥${tier.gift}）` : ''}`,
      });

      const params: Record<string, string> = {
        app_id: env.ALIPAY_APP_ID ?? '',
        method: 'alipay.trade.app.pay',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z').replace('T', ' '),
        version: '1.0',
        notify_url: env.ALIPAY_NOTIFY_URL ?? `${env.APP_URL}/api/v1/payments/alipay/notify`,
        biz_content: bizContent,
      };

      params.sign = signAlipayParams(params);
      payUrl = buildAlipayUrl(params);
    } else if (payMethod === 'wechat') {
      // TODO: WeChat app pay — use统一下单接口
      payUrl = `https://api.example.com/mock-wechat-pay?order_no=${order.order_no}`;
    } else {
      // Stripe/PayPal — stub for now
      payUrl = `https://api.example.com/mock-pay?order_no=${order.order_no}&method=${payMethod}`;
    }

    return {
      ok: true,
      data: {
        order_no: order.order_no,
        pay_url: payUrl,
      },
    };
  },

  /**
   * Handle Alipay async notification callback.
   * Verifies signature, idempotency-checks trade_no, and credits wallet.
   */
  async handleAlipayCallback(params: Record<string, string>): Promise<boolean> {
    // 1. Verify signature
    if (!verifyAlipaySign(params)) {
      console.error('[Alipay] Signature verification failed', params);
      return false;
    }

    const tradeStatus = params.trade_status;
    const tradeNo = params.trade_no;
    const orderNo = params.out_trade_no;

    if (!orderNo) return false;

    // 2. Find order
    const order = await prisma.rechargeOrder.findUnique({ where: { order_no: orderNo } });
    if (!order) {
      console.error('[Alipay] Order not found:', orderNo);
      return false;
    }

    // 3. Idempotency: if already paid, return true
    if (order.status === 'PAID') return true;

    // 4. Only process successful payments
    if (tradeStatus !== 'TRADE_SUCCESS' && tradeStatus !== 'TRADE_FINISHED') {
      return false;
    }

    // 5. Check expiry
    if (new Date() > order.expired_at && order.status !== 'PAID') {
      await prisma.rechargeOrder.update({
        where: { id: order.id },
        data: { status: 'EXPIRED' },
      });
      return true;
    }

    // 6. Credit wallet
    const totalAmount = Number(order.amount) + Number(order.gift_amount);
    const wallet = await prisma.walletAccount.findUnique({ where: { user_id: order.user_id } });
    if (!wallet) return false;

    const balanceBefore = Number(wallet.available_balance);

    await prisma.$transaction(async (tx) => {
      // Update order
      await tx.rechargeOrder.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          trade_no: tradeNo ?? '',
          paid_at: new Date(),
        },
      });

      // Credit wallet
      await tx.walletAccount.update({
        where: { user_id: order.user_id },
        data: {
          available_balance: { increment: totalAmount },
          total_recharged: { increment: Number(order.amount) },
        },
      });

      // Write ledger: recharge
      await tx.walletLedger.create({
        data: {
          wallet_id: wallet.id,
          user_id: order.user_id,
          tx_type: 'RECHARGE',
          amount: Number(order.amount),
          balance_before,
          balance_after: balanceBefore + Number(order.amount),
          order_id: order.id,
          order_type: 'recharge_order',
          remark: `充值 ¥${Number(order.amount) / 100}`,
        },
      });

      // Write ledger: gift
      if (order.gift_amount > 0) {
        await tx.walletLedger.create({
          data: {
            wallet_id: wallet.id,
            user_id: order.user_id,
            tx_type: 'GIFT_CREDIT',
            amount: Number(order.gift_amount),
            balance_before: balanceBefore + Number(order.amount),
            balance_after: balanceBefore + totalAmount,
            order_id: order.id,
            order_type: 'recharge_order',
            remark: `充值赠送 ¥${Number(order.gift_amount) / 100}`,
          },
        });
      }
    });

    console.log(`[Alipay] Order ${orderNo} paid, credited ¥${totalAmount / 100} to user ${order.user_id}`);
    return true;
  },

  /**
   * Handle WeChat Pay callback.
   */
  async handleWechatCallback(params: Record<string, string>): Promise<boolean> {
    const transactionId = params['transaction_id'];
    if (!transactionId) return false;

    const orderNo = params['out_trade_no'];
    if (!orderNo) return false;

    const order = await prisma.rechargeOrder.findUnique({ where: { order_no: orderNo } });
    if (!order || order.status === 'PAID') return true;
    if (params['result_code'] !== 'SUCCESS') return false;

    const totalAmount = Number(order.amount) + Number(order.gift_amount);
    const wallet = await prisma.walletAccount.findUnique({ where: { user_id: order.user_id } });
    if (!wallet) return false;

    const balanceBefore = Number(wallet.available_balance);

    await prisma.$transaction(async (tx) => {
      await tx.rechargeOrder.update({
        where: { id: order.id },
        data: { status: 'PAID', trade_no: transactionId, paid_at: new Date() },
      });
      await tx.walletAccount.update({
        where: { user_id: order.user_id },
        data: {
          available_balance: { increment: totalAmount },
          total_recharged: { increment: Number(order.amount) },
        },
      });
      await tx.walletLedger.create({
        data: {
          wallet_id: wallet.id,
          user_id: order.user_id,
          tx_type: 'RECHARGE',
          amount: Number(order.amount),
          balance_before: balanceBefore,
          balance_after: balanceBefore + Number(order.amount),
          order_id: order.id,
          order_type: 'recharge_order',
          remark: `微信充值 ¥${Number(order.amount) / 100}`,
        },
      });
    });

    return true;
  },

  /**
   * Cancel order (user-initiated or timeout).
   */
  async cancelOrder(orderId: string, userId: string): Promise<{ ok: false; code: string; message: string } | { ok: true }> {
    const order = await prisma.rechargeOrder.findUnique({ where: { id: orderId } });
    if (!order || order.user_id !== userId) {
      return { ok: false, code: 'ORDER_NOT_FOUND', message: 'Order not found' };
    }
    if (order.status !== 'PENDING') {
      return { ok: false, code: 'CANNOT_CANCEL', message: 'Only pending orders can be cancelled' };
    }

    await prisma.rechargeOrder.update({
      where: { id: orderId },
      data: { status: 'EXPIRED' },
    });

    return { ok: true };
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
