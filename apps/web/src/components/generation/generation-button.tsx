'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface GenerationButtonProps {
  estimate: number; // in yuan
  balance: number | null; // in yuan
  disabled?: boolean;
  loading?: boolean;
  label?: string;
}

export function GenerationButton({
  estimate,
  balance,
  disabled,
  loading,
  label,
}: GenerationButtonProps) {
  const t = useTranslations('image');
  const insufficient = balance !== null && balance < estimate;

  if (insufficient) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#94a3b8', fontSize: 14 }}>
            {t('estimate') ?? '预估费用'}：<strong style={{ color: '#f59e0b' }}>¥{estimate.toFixed(2)}</strong>
          </div>
          <div style={{ color: '#ef4444', fontSize: 12, marginTop: 2 }}>
            余额不足（当前余额 ¥{(balance ?? 0).toFixed(2)}）
          </div>
        </div>
        <Link
          href="/dashboard"
          style={{
            padding: '12px 20px', borderRadius: 10,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          💰 余额不足，去充值
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {balance !== null && (
        <div style={{ color: '#94a3b8', fontSize: 14 }}>
          {t('estimate') ?? '预估费用'}：<strong style={{ color: '#e2e8f0' }}>¥{estimate.toFixed(2)}</strong>
          <span style={{ color: '#64748b', marginLeft: 8 }}>
            余额 ¥{balance.toFixed(2)}
          </span>
        </div>
      )}
      <button
        disabled={disabled || loading}
        style={{
          padding: '12px 28px', borderRadius: 10,
          background: disabled || loading
            ? 'rgba(99,102,241,0.4)'
            : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff', border: 'none', fontSize: 15, fontWeight: 700,
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          boxShadow: disabled || loading ? 'none' : '0 4px 14px rgba(99,102,241,0.4)',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
        }}
      >
        {loading ? `⚡ ${t('generating')}` : label ?? `🚀 ${t('generate')}（¥${estimate.toFixed(2)}）`}
      </button>
    </div>
  );
}
