'use client';

import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { SSECompleted, SSEFailed, SSEProgress, SSETaskQueued, SSETaskStarted } from '@/lib/shared-types';
import { useTranslations } from 'next-intl';

interface GenerationStatusProps {
  taskId: string;
  streamUrl?: string;
  onComplete?: (outputs: SSECompleted['outputs']) => void;
  onError?: (err: string) => void;
  onFavorite?: (taskId: string) => void;
  onRegenerate?: (taskId: string) => void;
}

type Status = 'queued' | 'started' | 'progress' | 'completed' | 'failed';

export function GenerationStatus({
  taskId,
  streamUrl,
  onComplete,
  onError,
  onFavorite,
  onRegenerate,
}: GenerationStatusProps) {
  const t = useTranslations('status');
  const tToast = useTranslations('toast');
  const [status, setStatus] = useState<Status>('queued');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(t('queuedMsg', { position: '?' }));
  const [outputs, setOutputs] = useState<Array<{ url: string; thumbnail_url?: string; width?: number; height?: number }>>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const esRef = useRef<EventSource | null>(null);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (streamUrl) {
      const es = new EventSource(streamUrl);
      esRef.current = es;

      es.addEventListener('queued', (e: MessageEvent) => {
        const data = JSON.parse(e.data) as SSETaskQueued;
        setStatus('queued');
        setMessage(t('queuedMsg', { position: data.position?.toString() ?? '?' }));
      });

      es.addEventListener('started', (e: MessageEvent) => {
        const data = JSON.parse(e.data) as SSETaskStarted;
        setStatus('started');
        setMessage(t('startedMsg'));
      });

      es.addEventListener('progress', (e: MessageEvent) => {
        const data = JSON.parse(e.data) as SSEProgress;
        setStatus('progress');
        setProgress(data.progress);
        setMessage(t('progressMsg', { progress: data.progress.toString() }));
      });

      es.addEventListener('completed', (e: MessageEvent) => {
        const data = JSON.parse(e.data) as SSECompleted;
        setStatus('completed');
        setProgress(100);
        setMessage(t('completedMsg'));
        setOutputs(data.outputs);
        onComplete?.(data.outputs);
        es.close();
      });

      es.addEventListener('failed', (e: MessageEvent) => {
        const data = JSON.parse(e.data) as SSEFailed;
        setStatus('failed');
        setErrorMsg(data.error);
        onError?.(data.error);
        es.close();
      });

      es.onerror = (): void => {
        es.close();
        pollTask();
      };

      return () => es.close();
    } else {
      pollTask();
      return undefined;
    }
  }, [taskId]);

  const pollTask = async () => {
    const poll = async () => {
      try {
        const task = await apiClient.tasks.get(taskId);
        if (task.status === 'QUEUED') {
          setStatus('queued');
          setMessage(t('queuedMsg', { position: '?' }));
        } else if (task.status === 'PROCESSING') {
          setStatus('progress');
          setProgress(50);
          setMessage(t('progressMsg', { progress: '50' }));
        } else if (task.status === 'SUCCEEDED') {
          setStatus('completed');
          setProgress(100);
          setMessage(t('completedMsg'));
          setOutputs(task.outputs);
          onComplete?.(task.outputs as SSECompleted['outputs']);
          return;
        } else if (task.status === 'FAILED') {
          setStatus('failed');
          setErrorMsg(t('failedMsg'));
          onError?.(t('failedMsg'));
          return;
        }
        setTimeout(poll, 3000);
      } catch {
        setStatus('failed');
        setErrorMsg(tToast('queryFailed'));
      }
    };
    poll();
  };

  const formatTime = (s: number) => {
    const locale = typeof window !== 'undefined' ? navigator.language : 'zh-CN';
    if (s < 60) return `${s}${t('seconds')}`;
    return `${Math.floor(s / 60)}${t('minutes')}${s % 60}${t('seconds')}`;
  };

  const eta = progress > 0 ? Math.round((elapsed / progress) * (100 - progress)) : null;

  const statusLabel = {
    queued: t('queued'),
    started: t('started'),
    progress: t('progress'),
    completed: t('completed'),
    failed: t('failed'),
  }[status];

  return (
    <div
      style={{
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
        padding: 20, background: 'rgba(255,255,255,0.03)', marginTop: 16,
      }}
    >
      {/* Status header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 10, height: 10, borderRadius: '50%',
            background: status === 'completed' ? '#22c55e'
              : status === 'failed' ? '#ef4444'
              : status === 'queued' ? '#f59e0b'
              : '#3b82f6',
            boxShadow: status !== 'failed' ? '0 0 6px currentColor' : 'none',
            animation: status !== 'completed' && status !== 'failed' ? 'pulse 1.5s infinite' : 'none',
          }}
        />
        <span style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 600 }}>
          {statusLabel}
        </span>
        <span style={{ color: '#64748b', fontSize: 13, marginLeft: 'auto' }}>
          {formatTime(elapsed)}
        </span>
      </div>

      {/* Progress bar */}
      {status !== 'completed' && status !== 'failed' && (
        <div>
          <div
            style={{
              height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.1)',
              overflow: 'hidden', marginBottom: 8,
            }}
          >
            <div
              style={{
                height: '100%', borderRadius: 4,
                background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                width: `${progress}%`, transition: 'width 0.5s ease',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
            <span>{message}</span>
            {eta !== null && <span>{t('remaining')} {formatTime(eta)}</span>}
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'failed' && (
        <div style={{ color: '#ef4444', fontSize: 14 }}>
          ❌ {errorMsg}
        </div>
      )}

      {/* Results */}
      {status === 'completed' && outputs.length > 0 && (
        <div>
          <div
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 12, marginTop: 16,
            }}
          >
            {outputs.map((o, i) => (
              <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                <img
                  src={o.thumbnail_url ?? o.url}
                  alt={`${t('result')} ${i + 1}`}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                />
                <div
                  style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: 8, opacity: 0,
                    transition: 'opacity 0.2s',
                  }}
                  className="result-overlay"
                >
                  <a href={o.url} download target="_blank" rel="noreferrer"
                    style={{
                      padding: '6px 12px', borderRadius: 6, background: '#6366f1',
                      color: '#fff', fontSize: 12, textDecoration: 'none',
                    }}
                  >
                    ⬇️ {t('download')}
                  </a>
                  <button
                    onClick={() => onFavorite?.(taskId)}
                    style={{
                      padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.2)',
                      color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    ⭐ {t('favorite')}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              onClick={() => onRegenerate?.(taskId)}
              style={{
                padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.08)',
                color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)',
                fontSize: 13, cursor: 'pointer',
              }}
            >
              🔄 {t('regenerate')}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .result-overlay:hover { opacity: 1 !important; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
