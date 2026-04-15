'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import type { TaskDetailResponse } from '@/lib/shared-types';

const TABS = ['全部', '🎨 图片', '🎬 视频', '🎙️ 语音'] as const;
type Tab = typeof TABS[number];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SUCCEEDED: { label: '✅ 成功', color: '#22c55e', bg: '#22c55e22' },
  PROCESSING: { label: '⏳ 处理中', color: '#3b82f6', bg: '#3b82f622' },
  QUEUED: { label: '📋 排队中', color: '#f59e0b', bg: '#f59e0b22' },
  FAILED: { label: '❌ 失败', color: '#ef4444', bg: '#ef444422' },
  CANCELLED: { label: '🚫 已取消', color: '#64748b', bg: '#64748b22' },
  CREATED: { label: '🆕 已创建', color: '#8b5cf6', bg: '#8b5cf622' },
  REFUND_PENDING: { label: '↩️ 退款中', color: '#06b6d4', bg: '#06b6d422' },
  REFUNDED: { label: '↩️ 已退款', color: '#06b6d4', bg: '#06b6d422' },
};

const TYPE_LABEL: Record<string, string> = {
  IMAGE: '🎨 图片',
  VIDEO: '🎬 视频',
  TTS: '🎙️ TTS',
  ASR: '📝 ASR',
  VOICE_CLONE: '🔊 克隆',
};

export function TaskHistory() {
  const [tab, setTab] = useState<Tab>('全部');
  const [tasks, setTasks] = useState<TaskDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    const typeFilter = tab === '全部' ? undefined : tab.replace(/^[^\s]+\s/, '') as TaskDetailResponse['task_type'];

    apiClient.tasks.list({
      ...(typeFilter ? { type: typeFilter } : {}),
      page,
      page_size: 20,
    })
      .then((res) => {
        setTasks(res.tasks as TaskDetailResponse[]);
        setTotalPages(res.pagination.total_pages);
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [tab, page]);

  return (
    <div>
      {/* Tab filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            style={{
              padding: '6px 16px', borderRadius: 20, border: '1px solid',
              borderColor: tab === t ? '#6366f1' : 'rgba(255,255,255,0.1)',
              background: tab === t ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: tab === t ? '#a5b4fc' : '#64748b', fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>加载中...</div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
          <p style={{ marginBottom: 16 }}>还没有创作记录</p>
          <Link href="/image" style={{ color: '#6366f1', textDecoration: 'none', fontSize: 14 }}>
            去生成第一张图片 →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tasks.map((task) => {
            const statusCfg = STATUS_CONFIG[task.status] ?? { label: task.status, color: '#64748b', bg: '#64748b22' };
            const thumb = task.outputs?.[0]?.thumbnail_url ?? task.outputs?.[0]?.url;
            const isVideo = task.task_type === 'VIDEO' && task.outputs?.[0]?.duration;
            const isAudio = ['TTS', 'ASR', 'VOICE_CLONE'].includes(task.task_type);

            return (
              <div
                key={task.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  transition: 'background 0.2s',
                }}
              >
                {/* Thumbnail */}
                <div style={{ flexShrink: 0 }}>
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      style={{
                        width: 52, height: 52, objectFit: 'cover',
                        borderRadius: 8,
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 52, height: 52, borderRadius: 8,
                      background: 'rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, color: '#64748b',
                    }}>
                      {TYPE_LABEL[task.task_type]?.charAt(0) ?? '?'}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.model_slug}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>
                    {TYPE_LABEL[task.task_type] ?? task.task_type} · ¥{(task.total_cost / 100).toFixed(2)}
                    {task.completed_at && ` · ${new Date(task.completed_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`}
                  </div>
                </div>

                {/* Status badge */}
                <span style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 12,
                  color: statusCfg.color, background: statusCfg.bg,
                  flexShrink: 0,
                }}>
                  {statusCfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

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
