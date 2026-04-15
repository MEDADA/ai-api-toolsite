'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { WalletLedgerRecord } from '@/lib/shared-types';

const TX_LABELS: Record<string, { label: string; color: string }> = {
  RECHARGE: { label: '💰 充值', color: '#22c55e' },
  GIFT_CREDIT: { label: '🎁 赠送', color: '#a855f7' },
  TASK_FREEZE: { label: '🔒 冻结', color: '#f59e0b' },
  TASK_SETTLE: { label: '📤 扣费', color: '#ef4444' },
  TASK_REFUND: { label: '↩️ 退款', color: '#3b82f6' },
  MEMBERSHIP_PURCHASE: { label: '👑 会员', color: '#ec4899' },
  MANUAL_ADJUSTMENT: { label: '✏️ 调整', color: '#64748b' },
};

export function ConsumptionTable() {
  const [records, setRecords] = useState<WalletLedgerRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiClient.wallet.getLedger({ page, page_size: 10 })
      .then((res) => {
        setRecords(res.records as WalletLedgerRecord[]);
        setTotalPages(res.pagination.total_pages);
      })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) {
    return <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>加载中...</div>;
  }

  if (records.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: '#64748b', fontSize: 14 }}>
        暂无消费记录
      </div>
    );
  }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['时间', '类型', '金额', '余额', '备注'].map((h) => (
                <th key={h} style={{
                  textAlign: 'left', padding: '10px 12px',
                  color: '#64748b', fontWeight: 600, fontSize: 12,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const txInfo = TX_LABELS[r.tx_type] ?? { label: r.tx_type, color: '#64748b' };
              const isPositive = r.amount > 0;
              return (
                <tr
                  key={r.id}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <td style={{ padding: '12px', color: '#64748b', fontSize: 13 }}>
                    {new Date(r.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 12,
                      background: `${txInfo.color}22`, color: txInfo.color,
                    }}>
                      {txInfo.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontWeight: 700, color: isPositive ? '#22c55e' : '#ef4444' }}>
                    {isPositive ? '+' : ''}¥{(r.amount / 100).toFixed(2)}
                  </td>
                  <td style={{ padding: '12px', color: '#e2e8f0' }}>
                    ¥{(r.balance_after / 100).toFixed(2)}
                  </td>
                  <td style={{ padding: '12px', color: '#64748b', fontSize: 13 }}>
                    {r.remark ?? r.order_id ?? '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '6px 14px', borderRadius: 6,
              background: 'rgba(255,255,255,0.06)', color: '#64748b',
              border: '1px solid rgba(255,255,255,0.1)', fontSize: 13,
              cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1,
            }}
          >
            上一页
          </button>
          <span style={{ color: '#64748b', fontSize: 13, padding: '6px 12px' }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '6px 14px', borderRadius: 6,
              background: 'rgba(255,255,255,0.06)', color: '#64748b',
              border: '1px solid rgba(255,255,255,0.1)', fontSize: 13,
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              opacity: page === totalPages ? 0.5 : 1,
            }}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
