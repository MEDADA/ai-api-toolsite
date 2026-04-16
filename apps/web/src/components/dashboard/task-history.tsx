'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import type { TaskDetailResponse } from '@/lib/shared-types';
import { useTranslations, useLocale } from 'next-intl';

const TABS_KEY = ['all', 'image', 'video', 'audio'] as const;
type Tab = typeof TABS_KEY[number];

const STATUS_CONFIG: Record<string, { labelKey: string; color: string; bg: string }> = {
  SUCCEEDED: { labelKey: 'status.completed', color: '#22c55e', bg: '#22c55e22' },
  PROCESSING: { labelKey: 'status.progress', color: '#3b82f6', bg: '#3b82f622' },
  QUEUED: { labelKey: 'status.queued', color: '#f59e0b', bg: '#f59e0b22' },
  FAILED: { labelKey: 'status.failed', color: '#ef4444', bg: '#ef444422' },
  CANCELLED: { labelKey: 'status.cancelled', color: '#64748b', bg: '#64748b22' },
  CREATED: { labelKey: 'status.created', color: '#8b5cf6', bg: '#8b5cf622' },
  REFUND_PENDING: { labelKey: 'status.refundPending', color: '#06b6d4', bg: '#06b6d422' },
  REFUNDED: { labelKey: 'status.refunded', color: '#06b6d4', bg: '#06b6d422' },
};

const TYPE_LABEL_KEY: Record<string, string> = {
  IMAGE: 'dashboard.taskSuffix.image',
  VIDEO: 'dashboard.taskSuffix.video',
  TTS: 'dashboard.taskSuffix.tts',
  ASR: 'dashboard.taskSuffix.asr',
  VOICE_CLONE: 'dashboard.taskSuffix.clone',
};

const TAB_ICONS: Record<string, string> = {
  all: '全部',
  image: '🎨 图片',
  video: '🎬 视频',
  audio: '🎙️ 语音',
};

export function TaskHistory() {
  const t = useTranslations();
  const th = useTranslations('taskHistory');
  const locale = useLocale();
  const L = (path: string) => `/${locale}${path}`;
  const [tab, setTab] = useState<Tab>('all');
  const [tasks, setTasks] = useState<TaskDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    const typeFilter = tab === 'all' ? undefined : (tab === 'image' ? 'IMAGE' : tab === 'video' ? 'VIDEO' : 'TTS') as TaskDetailResponse['task_type'];

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

  const tabLabel = (key: Tab) => {
    if (key === 'all') return th('loading').includes('加载') ? '全部' : 'All';
    return TAB_ICONS[key] || key;
  };

  return (
    <div>
      {/* Tab filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS_KEY.map((t) => (
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
            {tabLabel(t)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>{th('loading')}</div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
          <p style={{ marginBottom: 16 }}>还没有创作记录</p>
          <Link href={L("/image")} style={{ color: '#6366f1', textDecoration: 'none', fontSize: 14 }}>
            去生成第一张图片 →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tasks.map((task) => {
            const statusCfg = STATUS_CONFIG[task.status] ?? { labelKey: task.status, color: '#64748b', bg: '#64748b22' };
            const thumb = task.outputs?.[0]?.thumbnail_url ?? task.outputs?.[0]?.url;
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
                      {TYPE_LABEL_KEY[task.task_type]?.charAt(0) ?? '?'}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.model_slug}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>
                    {t(TYPE_LABEL_KEY[task.task_type] ?? 'dashboard.taskSuffix.image')} · ¥{(task.total_cost / 100).toFixed(2)}
                    {task.completed_at && ` · ${new Date(task.completed_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`}
                  </div>
                </div>

                {/* Status badge */}
                <span style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 12,
                  color: statusCfg.color, background: statusCfg.bg,
                  flexShrink: 0,
                }}>
                  {t(statusCfg.labelKey)}
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
            {th('prevPage')}
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
            {th('nextPage')}
          </button>
        </div>
      )}
    </div>
  );
}
