'use client';

import styles from './page.module.css';
import { SiteHeader } from '@/components/site-header';
import { useTranslations, useLocale } from 'next-intl';
import { useState, useRef, useEffect, useCallback } from 'react';
import { LightboxModal } from '@/components/lightbox-modal';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import type { ModelConfig } from '@/lib/shared-types';

// Doubao Seedream 系列 — 火山引擎官方模型
const DOUBAD_LOGO = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0"><circle cx="12" cy="12" r="11" fill="#4267B2"/><path d="M12 6C8.686 6 6 8.686 6 12s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="white"/><circle cx="12" cy="12" r="2" fill="white"/></svg>`;

const MODELS: (ModelConfig & { icon?: string; vendorLogo?: string; vendor?: string })[] = [
  {
    id: 'doubao-seedream-4.0',
    name: 'Doubao Seedream 4.0',
    desc: '免费额度 · 图文生图 · 高清稳定',
    price: '¥0.5/张',
    vendor: '火山引擎',
    vendorLogo: DOUBAD_LOGO,
    recommended: true,
    capabilities: {
      resolution: { options: ['1024x1024','2048x2048','1728x2304','2304x1728','1600x2848','2848x1600'], default: '2048x2048' },
      quality: { options: ['fast','standard','high'], default: 'standard' },
      count: { min: 1, max: 4, default: 1 },
      reference_image: true,
    },
  },
  {
    id: 'doubao-seedream-5.0-lite',
    name: 'Doubao Seedream 5.0 Lite',
    desc: '最新 · 组图 · 流式输出',
    price: '¥0.5/张',
    vendor: '火山引擎',
    vendorLogo: DOUBAD_LOGO,
    recommended: false,
    capabilities: {
      resolution: { options: ['1024x1024','2048x2048'], default: '2048x2048' },
      quality: { options: ['fast','standard','high'], default: 'standard' },
      count: { min: 1, max: 4, default: 1 },
      reference_image: true,
    },
  },
  {
    id: 'doubao-seedream-4.5',
    name: 'Doubao Seedream 4.5',
    desc: '4K 高清 · 组图支持',
    price: '¥0.5/张',
    vendor: '火山引擎',
    vendorLogo: DOUBAD_LOGO,
    recommended: false,
    capabilities: {
      resolution: { options: ['1024x1024','2048x2048','3072x3072'], default: '2048x2048' },
      quality: { options: ['fast','standard','high'], default: 'standard' },
      count: { min: 1, max: 4, default: 1 },
      reference_image: true,
    },
  },
  {
    id: 'doubao-seedream-3.0-t2i',
    name: 'Doubao Seedream 3.0 T2I',
    desc: '经典 T2I · 性价比',
    price: '¥0.3/张',
    vendor: '火山引擎',
    vendorLogo: DOUBAD_LOGO,
    recommended: false,
    capabilities: {
      resolution: { options: ['1024x1024'], default: '1024x1024' },
      quality: { options: ['standard'], default: 'standard' },
      count: { min: 1, max: 1, default: 1 },
    },
  },
];

const SIZES = ['1024x1024', '2048x2048', '1728x2304', '2304x1728', '1600x2848', '2848x1600'];
const SIZE_LABELS = ['512²', '768²', '1024²', '9:16'];
const QUALITIES = ['fast', 'standard', 'high'];
const QUALITY_LABELS = ['⚡快速', '✨标准', '🔥高质量'];
const COUNTS = [1, 2, 4];
const COUNT_LABELS = ['1张', '2张', '4张'];

interface HistoryItem {
  id: string;
  model: string;
  prompt: string;
  time: string;
  img: string;
  tag: string;
  status?: 'generating' | 'completed';
  progress?: number;
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

export default function ImagePage() {
  const t = useTranslations('image');
  const tf = useTranslations('footer');
  const locale = useLocale();
  const { isLoggedIn, balance, refetchBalance } = useAuth();
  const { success, error: showError } = useToast();
  const L = (path: string) => `/${locale}${path}`;

  const [selectedModel, setSelectedModel] = useState(MODELS[0]!);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedSize, setSelectedSize] = useState<string>(MODELS[0]!.capabilities.resolution?.default ?? '2048x2048');
  const [selectedQuality, setSelectedQuality] = useState<string>(MODELS[0]!.capabilities.quality?.default ?? 'standard');
  const [selectedCount, setSelectedCount] = useState<number>(MODELS[0]!.capabilities.count?.default ?? 1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filter, setFilter] = useState('all');
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [initImage, setInitImage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load history from API on mount
  useEffect(() => {
    if (!isLoggedIn) return;
    apiClient.tasks.list({ type: 'IMAGE', page: 1, page_size: 50 }).then(res => {
      const items: HistoryItem[] = (res.tasks || []).map((t) => {
        const outputs = t.outputs || [];
        const first = outputs[0] || {};
        const inputParams = (t.input_params || {}) as { prompt?: string };
        return {
          id: t.id,
          model: t.model_slug || '—',
          prompt: inputParams.prompt || '',
          time: formatTime(t.created_at),
          img: (first as {url?:string}).url || '',
          tag: '图片',
        };
      });
      setHistory(items);
    }).catch(() => { /* ignore */ });
  }, [isLoggedIn]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setInitImage((e.target?.result as string) || '');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  }, [handleImageUpload]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!isLoggedIn) {
      showError(t('loginToGenerate'));
      return;
    }

    const size = selectedSize ?? '2048x2048';
    const [w, h] = size.split('x');
    const quality: 'fast' | 'standard' | 'high' = (selectedQuality ?? 'standard') as 'fast' | 'standard' | 'high';
    const imageCount = selectedCount ?? 1;
    const tempId = `gen_${Date.now()}`;

    // Add generating card at top of history
    const genCard: HistoryItem = {
      id: tempId,
      model: `${selectedModel.name} · ${size}`,
      prompt,
      time: '排队中…',
      img: '',
      tag: '图片',
      status: 'generating',
      progress: 5,
    };
    setHistory(prev => [genCard, ...prev]);

    try {
      const req: Record<string, unknown> = {
        model_slug: selectedModel.id,
        idem_key: `img-${Date.now()}`,
        prompt,
        width: w ?? '2048',
        height: h ?? '2048',
        num_inference_steps: quality,
        image_count: imageCount,
      };
      if (initImage) req.reference_image_url = initImage;
      const result = await apiClient.tasks.create(req as any);

      const tid = result.task_id;
      const startTime = Date.now();
      const ESTIMATED_SECS = quality === 'fast' ? 8 : quality === 'high' ? 30 : 15;

      // Poll task status every 2 seconds
      const pollInterval = setInterval(async () => {
        try {
          const task = await apiClient.tasks.get(tid);
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
            clearInterval(pollInterval);
            const newItems: HistoryItem[] = (task.outputs || []).map((o, i) => ({
              id: `${tid}-${i}`,
              model: `${selectedModel.name} · ${size}`,
              prompt,
              time: '刚刚',
              img: (o as { url?: string }).url || '',
              tag: '图片',
            }));
            setHistory(prev => newItems.concat(prev.filter(h => h.id !== tempId)));
            success(t('successImage'));
            refetchBalance();
          } else if (st === 'FAILED') {
            clearInterval(pollInterval);
            setHistory(prev => prev.filter(h => h.id !== tempId));
            showError(t('taskFailed'));
          }
        } catch {
          // poll errors are non-fatal, keep polling
        }
      }, 2000);

    } catch (err) {
      const e = err as { message?: string; code?: string };
      if (e.code === 'UNAUTHORIZED') {
        showError(t('loginToGenerate'));
      } else if (e.code === 'INSUFFICIENT_BALANCE') {
        showError(t('balance') + ' ⚠️');
      } else {
        showError(e.message ?? t('error'));
      }
    }
  };

  const imageCount = COUNTS[selectedCount] ?? 1;
  const generating = history.filter(h => h.status === 'generating');
  const completed = filter === 'fav' ? [] : history.filter(h => h.status !== 'generating' && h.tag === '图片');
  const filtered = [...generating, ...completed];

  return (
    <main style={{ minHeight: '100vh', background: '#08080f' }}>
      <SiteHeader />
      {lightboxSrc && <LightboxModal src={lightboxSrc} alt="生成结果" onClose={() => setLightboxSrc(null)} />}
      
      <div className={styles.layout}>

        {/* ── Left Panel ── */}
        <aside className={styles.leftPanel}>

          {/* Top bar */}
          <div className={styles.topBar}>
            <div className={styles.modelSelector} ref={dropdownRef}>
              <div className={styles.modelPill} onClick={() => setDropdownOpen(d => !d)}>
                <span className={styles.modelPillIcon} dangerouslySetInnerHTML={{ __html: selectedModel!.vendorLogo as unknown as string }} />
                <div className={styles.modelPillInfo}>
                  <span className={styles.modelPillName}>{selectedModel!.name}</span>
                  <span className={styles.modelPillVendor}>{selectedModel!.vendor}</span>
                </div>
                <span style={{ fontSize: 9, color: '#475569' }}>▼</span>
              </div>
              <div className={`${styles.modelDropdown} ${dropdownOpen ? styles.modelDropdownOpen : ''}`}>
                {MODELS.map(m => (
                  <div key={m.id} className={`${styles.modelOption} ${m.id === selectedModel!.id ? styles.modelOptionSelected : ''} ${m.recommended ? styles.modelOptionRecommended : ''}`}
                    onClick={() => {
                      setSelectedModel(m);
                      setSelectedSize(m.capabilities.resolution?.default ?? '2048x2048');
                      setSelectedQuality(m.capabilities.quality?.default ?? 'standard');
                      setSelectedCount(m.capabilities.count?.default ?? 1);
                      setDropdownOpen(false);
                    }}>
                    <div className={styles.modelOptionLeft}>
                      <div className={styles.modelVendorBadge}>
                        <span dangerouslySetInnerHTML={{ __html: m.vendorLogo as unknown as string }} />
                        <span className={styles.modelVendorName}>{m.vendor}</span>
                      </div>
                      <div className={styles.modelInfo}>
                        <div className={styles.modelOptionName}>
                          {m.name}
                          {m.recommended && <span className={styles.modelRecommendTag}>免费额度</span>}
                        </div>
                        <div className={styles.modelOptionDesc}>{m.desc}</div>
                      </div>
                    </div>
                    <div className={styles.modelOptionRight}>
                      <span className={styles.modelOptionPrice}>{m.price}</span>
                      <span className={styles.modelOptionCheck}>✓</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop: chip buttons - dynamic based on model capabilities */}
            <div className={styles.chipsRow}>
              {/* Resolution */}
              {selectedModel!.capabilities.resolution && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <span className={styles.chipLabel}>{t('size')}</span>
                  {selectedModel!.capabilities.resolution!.options.map(opt => (
                    <button key={opt}
                      className={`${styles.chip} ${opt === selectedSize ? styles.chipActive : ''}`}
                      onClick={() => setSelectedSize(opt)}>
                      <span>{opt}</span>
                    </button>
                  ))}
                </div>
              )}
              {/* Quality */}
              {selectedModel!.capabilities.quality && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <span className={styles.chipLabel}>{t('quality')}</span>
                  {selectedModel!.capabilities.quality!.options.map(opt => (
                    <button key={opt}
                      className={`${styles.chip} ${opt === selectedQuality ? styles.chipActive : ''}`}
                      onClick={() => setSelectedQuality(opt)}>
                      <span>{opt === 'fast' ? '⚡快速' : opt === 'high' ? '🔥高质量' : '✨标准'}</span>
                    </button>
                  ))}
                </div>
              )}
              {/* Count */}
              {selectedModel!.capabilities.count && selectedModel!.capabilities.count!.max > 1 && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <span className={styles.chipLabel}>{t('count')}</span>
                  {Array.from({ length: selectedModel!.capabilities.count!.max }, (_, i) => i + 1).map(n => (
                    <button key={n}
                      className={`${styles.chip} ${n === selectedCount ? styles.chipActive : ''}`}
                      onClick={() => setSelectedCount(n)}>
                      <span>{n}张</span>
                    </button>
                  ))}
                </div>
              )}
              {/* Reference image */}
              {selectedModel!.capabilities.reference_image && (
                initImage ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={initImage} alt="参考图"
                      style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', border: '1px solid rgba(99,102,241,0.4)' }} />
                    <button onClick={() => setInitImage('')}
                      style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', lineHeight: '14px', textAlign: 'center' }}>✕</button>
                  </div>
                ) : (
                  <button className={`${styles.chip} ${styles.refChip}`} title={t('uploadRef')}
                    onClick={() => fileInputRef.current?.click()}>
📷
                  </button>
                )
              )}
            </div>

            {/* Mobile: dropdown selects - dynamic based on model capabilities */}
            <div className={styles.mobileOptions}>
              {selectedModel!.capabilities.resolution && (
                <div className={styles.mobileSelectWrap}>
                  <label className={styles.mobileSelectLabel}>{t('size')}</label>
                  <select className={styles.mobileSelect} value={selectedSize}
                    onChange={e => setSelectedSize(e.target.value)}>
                    {selectedModel!.capabilities.resolution!.options.map(opt =>
                      <option key={opt} value={opt}>{opt}</option>
                    )}
                  </select>
                </div>
              )}
              {selectedModel!.capabilities.quality && (
                <div className={styles.mobileSelectWrap}>
                  <label className={styles.mobileSelectLabel}>{t('quality')}</label>
                  <select className={styles.mobileSelect} value={selectedQuality}
                    onChange={e => setSelectedQuality(e.target.value)}>
                    {selectedModel!.capabilities.quality!.options.map(opt =>
                      <option key={opt} value={opt}>{opt}</option>
                    )}
                  </select>
                </div>
              )}
              {selectedModel!.capabilities.count && selectedModel!.capabilities.count!.max > 1 && (
                <div className={styles.mobileSelectWrap}>
                  <label className={styles.mobileSelectLabel}>{t('count')}</label>
                  <select className={styles.mobileSelect} value={selectedCount}
                    onChange={e => setSelectedCount(Number(e.target.value))}>
                    {Array.from({ length: selectedModel!.capabilities.count!.max }, (_, i) => i + 1).map(n =>
                      <option key={n} value={n}>{n}张</option>
                    )}
                  </select>
                </div>
              )}
              {/* Reference image - always visible on mobile */}
              {selectedModel!.capabilities.reference_image && (
                initImage ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={styles.mobileSelectLabel}>参考图</span>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img key={initImage.slice(-20)} src={initImage} alt="参考图"
                        style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', border: '1px solid rgba(99,102,241,0.4)' }} />
                      <button onClick={() => setInitImage('')}
                        style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', lineHeight: '14px', textAlign: 'center' }}>✕</button>
                    </div>
                  </div>
                ) : (
                  <button
                    className={`${styles.chip} ${styles.refChip}`}
                    title={t('uploadRef')}
                    onClick={() => fileInputRef.current?.click()}

                  >
📷 上传参考图
                  </button>
                )
              )}
            </div>

          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {/* Prompt + Generate (tight unit) */}
          <div className={styles.coreUnit}>
            <div className={styles.promptBox}>
              <textarea
                className={styles.promptTextarea}
                placeholder={t('promptPlaceholder')}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate(); }}
              />
              <div className={styles.promptFooter}>
                <span />
                <span className={styles.charCount}>{prompt.length} {t('charCount')}</span>
              </div>
            </div>
            <button
              className={styles.generateBtn}
              onClick={handleGenerate}
              disabled={!prompt.trim()}
            >
              {'🎨 ' + t('generate')}
            </button>
          </div>

          <p className={styles.balanceHint}>
            {t('balance')} <strong>¥{balance ? (balance.available / 100).toFixed(2) : '--'}</strong>
            {isLoggedIn ? '' : ' · ' + t('loginToGenerate')}
          </p>
        </aside>

        {/* ── Right Panel: History ── */}
        <main className={`${styles.rightPanel} ${styles.rightPanelOpen}`}>
          <div className={styles.historyTopbar}>
            <div>
              <span className={styles.historyHeading}>{t('resultHistory')}</span>
              <span className={styles.historyCount}>{history.length} {t('records')}</span>
            </div>
            <div className={styles.historyFilter}>
              {([t('filterAll'), t('filterImage'), t('filterFav')] as const).map((f, i) => {
                const vals = ['all' as const, '图片' as const, '收藏' as const];
                return <button key={f} className={`${styles.filterBtn} ${filter === vals[i] ? styles.filterBtnActive : ''}`} onClick={() => setFilter(vals[i]!)}>{f}</button>;
              })}
            </div>
          </div>

          <div className={styles.historyGrid}>
            {filtered.map(item => (
              item.status === 'generating' ? (
                <div key={item.id} className={`${styles.historyCard} ${styles.generatingCard}`}>
                  <div className={styles.genPreview} style={{ gridTemplateColumns: imageCount > 1 ? `repeat(${Math.min(imageCount, 2)}, 1fr)` : '1fr' }}>
                    {Array.from({ length: imageCount }).map((_, i) => (
                      <div key={i} className={`${styles.genSlot} ${styles.genSlotEmpty}`}>
                        <span className={styles.spinner} style={{ width: 10, height: 10, borderWidth: 1.5 }} />
                      </div>
                    ))}
                  </div>
                  <div className={styles.genHeader}>
                    <span className={styles.genLabel}>🎨 {item.time}</span>
                    {item.progress !== undefined && (
                      <span style={{ fontSize: 9, color: '#a5b4fc', marginLeft: 'auto' }}>{item.progress}%</span>
                    )}
                  </div>
                  <div className={styles.genPrompt}>{item.prompt}</div>
                  <div className={styles.genProgressTrack}>
                    <div className={styles.genProgressBar} style={{ width: `${item.progress ?? 0}%` }} />
                  </div>
                </div>
              ) : (
                <div key={item.id} className={styles.historyCard}>
                  <img className={styles.historyImg} src={item.img} alt={item.prompt} loading="lazy" onClick={() => setLightboxSrc(item.img)} style={{ cursor: "zoom-in" }} />
                  <div className={styles.historyCardBody}>
                    <span className={styles.historyModelTag}>{item.model}</span>
                  </div>
                  <div className={styles.historyCardFooter}>
                    <span className={styles.historyTime}>{item.time}</span>
                    <div className={styles.historyActions}>
                      <button
                        className={styles.histAct}
                        onClick={() => {
                          if (!item.img) { showError('图片还未生成，请稍候'); return; }
                          const a = document.createElement('a');
                          a.href = item.img; a.download = `ai-image-${item.id}.png`; a.target = '_blank'; a.click();
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
            ))}
          </div>
        </main>
      </div>
    </main>
  );
}
