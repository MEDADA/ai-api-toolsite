'use client';
import styles from '../image/page.module.css';
import { SiteHeader } from '@/components/site-header';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import type { ModelConfig } from '@/lib/shared-types';

const MODELS: (ModelConfig & { icon?: string })[] = [
  {
    id: 'doubao-seedance-1.5-pro',
    name: 'Seedance 1.5 Pro',
    desc: '高质量 · 中文理解强 · 参考图支持',
    price: '¥1.5/次',
    icon: '🎬',
    capabilities: {
      duration: { options: [5, 10, 15], default: 5 },
      video_resolution: { options: ['540p', '720p', '1080p'], default: '720p' },
      reference_image: true,
    },
  },
];

const CAMERAS = ['固定', '环绕', '推进', '平移'];
const PLACEHOLDER = '描述你想要的视频场景… 例如：无人机穿越峡谷，极速飞行体验';

interface HistoryItem {
  id: string; model: string; prompt: string; time: string;
  img: string; status?: 'generating' | 'completed'; progress?: number;
}

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  return `${Math.floor(h / 24)} 天前`;
}

export default function VideoPage() {
  const t = useTranslations('video');
  const locale = useLocale();
  const { isLoggedIn } = useAuth();

  // Load history from API on mount
  useEffect(() => {
    if (!isLoggedIn) return;
    apiClient.tasks.list({ type: 'VIDEO', page: 1, page_size: 50 }).then(res => {
      const items: HistoryItem[] = (res.tasks || [])
        .filter(t => t.status === 'SUCCEEDED')
        .map((t) => {
          const outputs = t.outputs || [];
          const first = outputs[0] || {};
          const inputParams = (t.input_params || {}) as { prompt?: string };
          return {
            id: t.id,
            model: t.model_slug || '—',
            prompt: inputParams.prompt || '',
            time: formatTime(t.created_at),
            img: (first as { url?: string }).url || '',
            status: 'completed' as const,
            progress: 100,
          };
        });
      if (items.length > 0) setHistory(items);
    }).catch(() => {});
  }, [isLoggedIn]);

  const { success, info, error: showError } = useToast();
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [duration, setDuration] = useState<number>(MODELS[0]!.capabilities.duration?.default ?? 5);
  const [videoResolution, setVideoResolution] = useState<string>(MODELS[0]!.capabilities.video_resolution?.default ?? '720p');
  const [camera, setCamera] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [initImage, setInitImage] = useState<string>('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'video' | 'fav'>('all');
  const [uploading, setUploading] = useState(false);
  const [showRefUpload, setShowRefUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyPanelRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setInitImage(dataUrl);
        setUploading(false);
      };
      reader.onerror = () => setUploading(false);
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  }, [handleImageUpload]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    if (!isLoggedIn) { info('请先登录'); return; }

    const tempId = `temp_${Date.now()}`;
    const durationSec = duration;
    const genCard: HistoryItem = {
      id: tempId, model: selectedModel!.name, prompt,
      time: '生成中…', img: '', status: 'generating', progress: 0,
    };
    setHistory(prev => [genCard, ...prev]);
    // Scroll to history panel
    setTimeout(() => historyPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

    try {
      const result = await apiClient.tasks.create({
        model_slug: 'doubao-seedance-1.5-pro',
        prompt,
        duration: durationSec,
        resolution: videoResolution as '540p' | '720p' | '1080p',
        reference_image_url: initImage || undefined,
      } as any);

      const task_id = result.task_id;
      const startTime = Date.now();
      // Video generation time: ~10x video duration
      const ESTIMATED_SECS = durationSec * 12;
      setHistory(prev => prev.map(h => h.id === tempId ? { ...h, time: '排队中…', progress: 3 } : h));

      // Poll task status every 2s
      const poll = setInterval(async () => {
        try {
          const task = await apiClient.tasks.get(task_id);
          const st = task.status;
          if (st === 'PROCESSING' || st === 'QUEUED' || st === 'CREATED') {
            const elapsedSec = (Date.now() - startTime) / 1000;
            const pct = Math.min(95, Math.round((elapsedSec / ESTIMATED_SECS) * 100));
            const label = elapsedSec < 60
              ? `生成中… ${Math.round(elapsedSec)}秒`
              : `生成中… ${Math.round(elapsedSec / 60)}分`;
            setHistory(prev => prev.map(h => h.id === tempId ? {
              ...h, time: label, progress: pct,
            } : h));
          } else if (st === 'SUCCEEDED') {
            clearInterval(poll);
            const videoUrl = (task.outputs as Array<{url?:string}>)?.[0]?.url || '';
            setHistory(prev => prev.map(h => h.id === tempId ? {
              ...h, id: task_id, img: videoUrl, status: 'completed', time: '刚刚', progress: 100,
            } : h));
            success('🎬 视频生成成功！');
          } else if (st === 'FAILED') {
            clearInterval(poll);
            setHistory(prev => prev.filter(h => h.id !== tempId));
            info('生成失败，请稍后重试');
          }
        } catch { /* poll errors non-fatal */ }
      }, 2000);

    } catch (err: any) {
      setHistory(prev => prev.filter(h => h.id !== tempId));
      info(err.message || '生成失败');
    }
  }, [prompt, selectedModel, duration, videoResolution, initImage]);

  return (
    <main style={{ minHeight: '100vh', background: '#08080f' }}>
      <SiteHeader />
      <div className={styles.layout}>

        {/* Left */}
        <aside className={styles.leftPanel}>

          {/* Top bar */}
          <div className={styles.topBar}>
            {/* Model selector */}
            <div className={styles.modelSelector} ref={dropdownRef}>
              <div className={styles.modelPill} onClick={() => setDropdownOpen(d => !d)}>
                <span className={styles.modelPillIcon}>{selectedModel!.icon}</span>
                <span className={styles.modelPillName}>{selectedModel!.name}</span>
                <span style={{ fontSize: 9, color: '#475569' }}>▼</span>
              </div>
              <div className={`${styles.modelDropdown} ${dropdownOpen ? styles.modelDropdownOpen : ''}`}>
                {MODELS.map(m => (
                  <div key={m.id} className={`${styles.modelOption} ${m.id === selectedModel!.id ? styles.modelOptionSelected : ''}`}
                    onClick={() => {
                      setSelectedModel(m);
                      if (m.capabilities.duration) setDuration(m.capabilities.duration.default);
                      if (m.capabilities.video_resolution) setVideoResolution(m.capabilities.video_resolution.default);
                      setDropdownOpen(false);
                    }}>
                    <div className={styles.modelOptionLeft}>
                      <span style={{ fontSize: 16 }}>{m.icon}</span>
                      <div>
                        <div className={styles.modelOptionName}>{m.name}</div>
                        <div className={styles.modelOptionDesc}>{m.desc}</div>
                      </div>
                    </div>
                    <span className={styles.modelOptionPrice}>{m.price}</span>
                    <span className={styles.modelOptionCheck}>✓</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic chips based on model capabilities */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {/* Duration */}
              {selectedModel!.capabilities.duration && (
                <>
                  <span className={styles.chipLabel}>{t('duration')}</span>
                  {selectedModel!.capabilities.duration!.options.map(d => (
                    <button key={d}
                      className={`${styles.chip} ${d === duration ? styles.chipActive : ''}`}
                      onClick={() => setDuration(d)}>
                      <span>{d}秒</span>
                    </button>
                  ))}
                </>
              )}
              {/* Resolution */}
              {selectedModel!.capabilities.video_resolution && (
                <>
                  <span className={styles.chipLabel}>{t('resolution')}</span>
                  {selectedModel!.capabilities.video_resolution!.options.map(r => (
                    <button key={r}
                      className={`${styles.chip} ${r === videoResolution ? styles.chipActive : ''}`}
                      onClick={() => setVideoResolution(r)}>
                      <span>{r}</span>
                    </button>
                  ))}
                </>
              )}
              {/* Reference image */}
              {selectedModel!.capabilities.reference_image && (
                initImage ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={initImage}
                      alt="参考图"
                      style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', border: '1px solid rgba(99,102,241,0.4)' }}
                    />
                    <button
                      onClick={() => setInitImage('')}
                      style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', lineHeight: '14px', textAlign: 'center' }}
                    >✕</button>
                  </div>
                ) : (
                  <button
                    className={`${styles.chip} ${styles.refChip} ${initImage ? styles.chipActive : ''}`}
                    title={t('refImageTitle')}
                    onClick={() => setShowRefUpload(true)}>
                    📷
                  </button>
                )
              )}
            </div>
          </div>

          <div className={styles.coreUnit}>
            <div className={styles.promptBox}>
              <textarea className={styles.promptTextarea}
                placeholder={PLACEHOLDER}
                value={prompt} onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate(); }}
              />
              <div className={styles.promptFooter}>
                <span />
                <span className={styles.charCount}>{prompt.length} / 1000</span>
              </div>
            </div>
            <button className={styles.generateBtn} onClick={handleGenerate}
              disabled={!prompt.trim()}>
              {'🎬 ' + t('generate')}
            </button>
          </div>
          <p className={styles.balanceHint}>
            💡 {t('refImageEnabled')} {initImage && '✓'}
            {' · '}{t('balance')} <strong>¥4.84</strong> · {t('estimate')} ¥{[5,10,15][duration]! * 1.5}
          </p>
        </aside>

        {/* Right */}
        <main className={`${styles.rightPanel} ${styles.rightPanelOpen}`}>
          <div className={styles.historyTopbar}>
            <div><span className={styles.historyHeading}>{t('history')}</span><span className={styles.historyCount}>{history.length} 条</span></div>
            <div className={styles.historyFilter}>
              {[t('filterAll'), t('filterVideo'), t('filterFav')].map((f,i) => {
              const vals: Array<'all'|'video'|'fav'> = ['all', 'video', 'fav'];
              return <button key={f} className={`${styles.filterBtn} ${filter === vals[i] ? styles.filterBtnActive : ''}`} onClick={() => setFilter(vals[i]!)}>{f}</button>;
            })}
            </div>
          </div>
          <div className={styles.historyGrid} ref={historyPanelRef}>
            {(() => {
              const generatingItems = history.filter(h => h.status === 'generating');
              const completedItems = filter === 'all' ? history.filter(h => h.status !== 'generating') : filter === 'video' ? history.filter(h => h.status !== 'generating') : [];
              return [...generatingItems, ...completedItems].map(item => (
              item.status === 'generating' ? (
                <div key={item.id} className={`${styles.historyCard} ${styles.generatingCard}`}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, background: 'rgba(99,102,241,0.06)', borderRadius: '10px 10px 0 0' }}>
                    <span className={styles.spinner} style={{ width: 28, height: 28, borderWidth: 3 }} />
                  </div>
                  <div className={styles.genHeader}>
                    <span className={styles.genLabel}>🎬 {item.time}</span>
                    {item.progress !== undefined && (
                      <span style={{ fontSize: 9, color: '#60a5fa', marginLeft: 'auto' }}>{item.progress}%</span>
                    )}
                  </div>
                  <div className={styles.genPrompt}>{item.prompt}</div>
                  <div className={styles.genProgressTrack}>
                    <div className={styles.genProgressBar} style={{ width: `${item.progress ?? 0}%` }} />
                  </div>
                </div>
              ) : (
                <div key={item.id} className={styles.historyCard}>
                  <video
                    className={styles.historyThumb}
                    src={item.img}
                    controls
                    muted
                    playsInline
                    preload="metadata"
                    style={{ width: '100%', display: 'block', background: '#000' }}
                  />
                  <div className={styles.historyBody}>
                    <span className={styles.historyTag}>{item.model}</span>
                    <p className={styles.historyPrompt}>{item.prompt}</p>
                  </div>
                  <div className={styles.historyFooter}>
                    <span className={styles.historyTime}>{item.time}</span>
                    <div className={styles.historyActions}>
                      <button
                        className={styles.histAct}
                        onClick={e => {
                          e.stopPropagation();
                          if (!item.img) { showError('视频还未生成，请稍候'); return; }
                          window.open(item.img, '_blank');
                        }}
                      >⬇</button>
                      <button
                        className={styles.histAct}
                        onClick={() => success('已收藏到收藏夹')}
                      >⭐</button>
                    </div>
                  </div>
                </div>
              )
            ));
            })()}
          </div>
        </main>
      </div>

      {/* Reference image upload popup */}
      {showRefUpload && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowRefUpload(false); }}
        >
          <div style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, width: 340, maxWidth: '90vw' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, margin: 0 }}>📷 {t('refImageTitle')}</h3>
              <button onClick={() => setShowRefUpload(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            {initImage ? (
              <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                <img src={initImage} alt="参考图" style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', maxHeight: 200, objectFit: 'cover' }} />
                <button
                  onClick={() => setInitImage('')}
                  style={{ position: 'absolute', top: -8, right: -8, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12 }}
                >✕</button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ border: '2px dashed rgba(255,255,255,0.15)', borderRadius: 12, padding: 28, textAlign: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#6366f1'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(99,102,241,0.05)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.15)'; (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                {uploading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 13 }}>{t('uploading')}</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 28 }}>📷</span>
                    <span style={{ fontSize: 13, color: '#64748b' }}>{t('refImageUpload')}</span>
                    <span style={{ fontSize: 11, color: '#475569' }}>{t('refImageHint')}</span>
                  </div>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

            <p style={{ color: '#475569', fontSize: 12, marginTop: 12, marginBottom: 16, textAlign: 'center' }}>
              {t('refImageDesc')}
            </p>
            <button
              onClick={() => setShowRefUpload(false)}
              style={{ width: '100%', padding: '10px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              {t('refImageConfirm')}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
