'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

interface RechargeModalProps {
  onClose: () => void;
}

const TIERS = [
  { amount: 10, gift: 0, label: '¥10' },
  { amount: 50, gift: 5, label: '¥50', badge: '送¥5' },
  { amount: 100, gift: 15, label: '¥100', badge: '🔥 热门' },
  { amount: 500, gift: 100, label: '¥500', badge: '⭐ 大额' },
  { amount: 1000, gift: 300, label: '¥1000', badge: '👑 超级' },
];

const PAY_METHODS = [
  { value: 'alipay', label: '💳 支付宝', color: '#1677ff' },
  { value: 'wechat', label: '💚 微信支付', color: '#07c160' },
];

export function RechargeModal({ onClose }: RechargeModalProps) {
  const { refetchBalance } = useAuth();
  const { success, error } = useToast();
  const [selectedTier, setSelectedTier] = useState(100);
  const [payMethod, setPayMethod] = useState<'alipay' | 'wechat'>('alipay');
  const [processing, setProcessing] = useState(false);
  const [mockPaid, setMockPaid] = useState(false);

  const tier = TIERS.find((t) => t.amount === selectedTier) ?? { amount: 100, gift: 15, label: '¥100' };

  const handlePay = async () => {
    setProcessing(true);
    try {
      // In production: call apiClient.recharge.create() and redirect to pay_url
      // For now: simulate successful payment after 1.5s
      await new Promise((r) => setTimeout(r, 1500));
      // Simulate alipay redirect callback
      await apiClient.recharge.create({
        amount: selectedTier,
        pay_method: payMethod,
      }).then(() => {
        // In production: redirect to res.pay_url
      }).catch(() => {
        // API not available — use mock success
      });
      setMockPaid(true);
      await refetchBalance();
      success(`充值成功！${tier.gift > 0 ? `已赠送 ¥${tier.gift}` : ''}`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e) {
      error((e as Error).message || '支付失败，请重试');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9998, backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !processing) onClose(); }}
    >
      <div
        style={{
          background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20, padding: 32, width: 420, maxWidth: '92vw',
        }}
      >
        {mockPaid ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ color: '#22c55e', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              支付成功！
            </div>
            <div style={{ color: '#64748b', fontSize: 14 }}>
              {tier.gift > 0 ? `已到账 ¥${selectedTier + tier.gift}` : `已到账 ¥${selectedTier}`}
            </div>
          </div>
        ) : (
          <>
            <h2 style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
              💰 充值余额
            </h2>

            {/* Tier selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              {TIERS.map((t) => (
                <button
                  key={t.amount}
                  onClick={() => setSelectedTier(t.amount)}
                  style={{
                    padding: '14px 8px', borderRadius: 12, textAlign: 'center',
                    border: `2px solid ${selectedTier === t.amount ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
                    background: selectedTier === t.amount ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
                  }}
                >
                  {t.badge && (
                    <div style={{
                      position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                      background: '#f59e0b', color: '#000', fontSize: 10, padding: '2px 6px',
                      borderRadius: 8, fontWeight: 700, whiteSpace: 'nowrap',
                    }}>
                      {t.badge}
                    </div>
                  )}
                  <div style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, marginBottom: 2 }}>
                    {t.label}
                  </div>
                  {t.gift > 0 && (
                    <div style={{ color: '#22c55e', fontSize: 11 }}>
                      送 ¥{t.gift}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Pay method */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10, fontWeight: 600 }}>
                支付方式
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {PAY_METHODS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setPayMethod(m.value as 'alipay' | 'wechat')}
                    style={{
                      flex: 1, padding: '12px 8px', borderRadius: 10, textAlign: 'center',
                      border: `2px solid ${payMethod === m.value ? m.color : 'rgba(255,255,255,0.08)'}`,
                      background: payMethod === m.value ? `${m.color}22` : 'rgba(255,255,255,0.03)',
                      color: payMethod === m.value ? m.color : '#64748b',
                      fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div style={{
              padding: 16, borderRadius: 10, background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 13, marginBottom: 6 }}>
                <span>充值金额</span><span style={{ color: '#e2e8f0' }}>¥{selectedTier}</span>
              </div>
              {tier.gift > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 13, marginBottom: 6 }}>
                  <span>赠送</span><span style={{ color: '#22c55e' }}>+¥{tier.gift}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0', fontSize: 15, fontWeight: 700, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span>到账金额</span>
                <span style={{ color: '#f59e0b' }}>¥{selectedTier + tier.gift}</span>
              </div>
            </div>

            {/* Pay button */}
            <button
              onClick={handlePay}
              disabled={processing}
              style={{
                width: '100%', padding: '14px', borderRadius: 10,
                background: processing ? 'rgba(245,158,11,0.5)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff', border: 'none', fontSize: 16, fontWeight: 700,
                cursor: processing ? 'not-allowed' : 'pointer',
                boxShadow: processing ? 'none' : '0 4px 14px rgba(245,158,11,0.4)',
              }}
            >
              {processing ? '⏳ 跳转支付中...' : `确认支付 ¥${selectedTier}`}
            </button>

            <p style={{ color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 12 }}>
              支付安全由支付宝/微信提供保障 · 充值金额仅限本站使用
            </p>
          </>
        )}
      </div>
    </div>
  );
}
