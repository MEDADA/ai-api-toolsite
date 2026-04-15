'use client';

import React from 'react';
import { useAuth } from '@/contexts/auth-context';

interface BalanceCardProps {
  onRecharge: () => void;
}

export function BalanceCard({ onRecharge }: BalanceCardProps) {
  const { balance } = useAuth();
  const available = balance ? balance.available / 100 : 0;
  const frozen = balance ? balance.frozen / 100 : 0;
  const totalSpent = balance ? balance.total_spent / 100 : 0;
  const totalRecharged = balance ? balance.total_recharged / 100 : 0;

  return (
    <div
      style={{
        borderRadius: 16, overflow: 'hidden',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
        padding: '28px 32px', marginBottom: 28,
        position: 'relative',
      }}
    >
      {/* Glow effect */}
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 200, height: 200,
        borderRadius: '50%', background: 'rgba(99,102,241,0.15)',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 8 }}>可用余额</div>
          <div style={{ color: '#fff', fontSize: 40, fontWeight: 800, lineHeight: 1, marginBottom: 8 }}>
            ¥{available.toFixed(2)}
          </div>
          {frozen > 0 && (
            <div style={{ color: '#fbbf24', fontSize: 13 }}>
              🔒 冻结 ¥{frozen.toFixed(2)}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onRecharge}
            style={{
              padding: '12px 28px', borderRadius: 10,
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#fff', border: 'none', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(245,158,11,0.4)',
            }}
          >
            💰 充值
          </button>
          <a
            href="/image"
            style={{
              padding: '12px 20px', borderRadius: 10,
              background: 'rgba(255,255,255,0.1)', color: '#fff',
              textDecoration: 'none', fontSize: 14, fontWeight: 600,
            }}
          >
            🚀 开始创作
          </a>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        {[
          { label: '已消费', value: `¥${totalSpent.toFixed(2)}`, color: '#f472b6' },
          { label: '累计充值', value: `¥${totalRecharged.toFixed(2)}`, color: '#34d399' },
          { label: '余额状态', value: available > 0 ? '✅ 正常' : '⚠️ 不足', color: available > 0 ? '#34d399' : '#f59e0b' },
        ].map((s) => (
          <div key={s.label}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 4 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 16, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
