'use client';

import styles from './page.module.css';
import { SiteHeader } from '@/components/site-header';
import { useTranslations, useLocale } from 'next-intl';
import { useState, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import type { SSECompleted, SSEFailed, SSEProgress, SSETaskQueued } from '@/lib/shared-types';

const MODELS = [
  { id: 'flux-2-schnell', icon: '⚡', name: 'FLUX.2 schnell', desc: '快速 · 写实/动漫', price: '¥0.5/张' },
  { id: 'wanxiang-2-6', icon: '🔥', name: '万相 2.6', desc: '高质量 · 中文理解强', price: '¥0.5/张' },
  { id: 'flux-2-dev', icon: '✨', name: 'FLUX.2 dev', desc: '顶配 · 细节极致', price: '¥1.2/张' },
];

const SIZES = ['512', '768', '1024', '576x1024'];
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
  const [selectedSize, setSelectedSize] = useState(2);
  const [selectedQuality, setSelectedQuality] = useState(1);
  const [selectedCount, setSelectedCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filter, setFilter] = useState('all');
  const [genProgress, setGenProgress] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    if (!isLoggedIn) {
      showError(t('loginToGenerate'));
      return;
    }

    setIsGenerating(true);
    setGenProgress('');
    eventSourceRef.current?.close();

    const taskId = `img-${Date.now()}`;
    const size = SIZES[selectedSize] ?? '1024';
    const isPortrait = size === '576x1024';
    const quality: 'fast' | 'standard' | 'high' = (QUALITIES[selectedQuality] ?? 'standard') as 'fast' | 'standard' | 'high';

    try {
      const result = await apiClient.tasks.create({
        model_slug: selectedModel.id,
        idem_key: taskId,
        prompt,
        width: isPortrait ? '576' : size,
        height: isPortrait ? '1024' : size,
        num_inference_steps: quality,
        image_count: COUNTS[selectedCount] ?? 1,
      });

      const tid = result.task_id;

      // Connect to SSE stream
      const es = apiClient.tasks.getStream(tid);
      eventSourceRef.current = es;

      es.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data) as { type: string; data: unknown };
          if (parsed.type === 'queued') {
            const d = parsed.data as SSETaskQueued;
            setGenProgress(t('queuedMsg', { position: d.position?.toString() ?? '?' }));
          } else if (parsed.type === 'started') {
            setGenProgress(t('startedMsg'));
          } else if (parsed.type === 'progress') {
            const d = parsed.data as SSEProgress;
            setGenProgress(t('progressMsg', { progress: d.progress.toString() }));
          } else if (parsed.type === 'completed') {
            const d = parsed.data as SSECompleted;
            const newItems: HistoryItem[] = d.outputs.map((o, i) => ({
              id: `${tid}-${i}`,
              model: `${selectedModel.name} · ${size}`,
              prompt,
              time: '刚刚',
              img: o.url,
              tag: '图片',
            }));
            setHistory(prev => [...newItems, ...prev]);
            success(t('successImage'));
            refetchBalance();
            es.close();
            setIsGenerating(false);
            setGenProgress('');
          } else if (parsed.type === 'failed') {
            const d = parsed.data as SSEFailed;
            showError(t('taskFailed') + (d.error ? `: ${d.error}` : ''));
            es.close();
            setIsGenerating(false);
            setGenProgress('');
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
        setIsGenerating(false);
        setGenProgress('');
      };
    } catch (err) {
      const e = err as { message?: string; code?: string };
      if (e.code === 'UNAUTHORIZED') {
        showError(t('loginToGenerate'));
      } else if (e.code === 'INSUFFICIENT_BALANCE') {
        showError(t('balance') + ' ⚠️');
      } else {
        showError(e.message ?? t('error'));
      }
      setIsGenerating(false);
      setGenProgress('');
    }
  };

  const filtered = filter === 'all' ? history : history.filter(h => h.tag === filter);

  return (
    <main style={{ minHeight: '100vh', background: '#08080f' }}>
      <SiteHeader />
      <div className={styles.layout}>

        {/* ── Left Panel ── */}
        <aside className={styles.leftPanel}>

          {/* Top bar */}
          <div className={styles.topBar}>
            <div className={styles.modelSelector} ref={dropdownRef}>
              <div className={styles.modelPill} onClick={() => setDropdownOpen(d => !d)}>
                <span className={styles.modelPillIcon}>{selectedModel!.icon}</span>
                <span className={styles.modelPillName}>{selectedModel!.name}</span>
                <span style={{ fontSize: 9, color: '#475569' }}>▼</span>
              </div>
              <div className={`${styles.modelDropdown} ${dropdownOpen ? styles.modelDropdownOpen : ''}`}>
                {MODELS.map(m => (
                  <div key={m.id} className={`${styles.modelOption} ${m.id === selectedModel!.id ? styles.modelOptionSelected : ''}`}
                    onClick={() => { setSelectedModel(m); setDropdownOpen(false); }}>
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

            {[t('size'), t('quality'), t('count')].map((label, i) => (
              <div key={label} style={{ display: 'flex', gap: 4 }}>
                {i === 0 && SIZE_LABELS.map((s, si) => (
                  <button key={s} className={`${styles.chip} ${si === selectedSize ? styles.chipActive : ''}`}
                    onClick={() => setSelectedSize(si)}>
                    <span className={styles.chipLabel}>{label}</span>
                    <span className={styles.chipDiv}>·</span>
                    <span>{s}</span>
                  </button>
                ))}
                {i === 1 && QUALITY_LABELS.map((q, qi) => (
                  <button key={q} className={`${styles.chip} ${qi === selectedQuality ? styles.chipActive : ''}`}
                    onClick={() => setSelectedQuality(qi)}>
                    <span className={styles.chipLabel}>{label}</span>
                    <span className={styles.chipDiv}>·</span>
                    <span>{q}</span>
                  </button>
                ))}
                {i === 2 && COUNT_LABELS.map((c, ci) => (
                  <button key={c} className={`${styles.chip} ${ci === selectedCount ? styles.chipActive : ''}`}
                    onClick={() => setSelectedCount(ci)}>
                    <span className={styles.chipLabel}>{label}</span>
                    <span className={styles.chipDiv}>·</span>
                    <span>{c}</span>
                  </button>
                ))}
              </div>
            ))}

            <button className={`${styles.chip} ${styles.refChip}`} title={t('uploadRef')}>📷</button>
          </div>

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
              disabled={isGenerating || !prompt.trim()}
            >
              {isGenerating ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span className={styles.spinner} /> {genProgress || t('generating')}
                </span>
              ) : '🎨 ' + t('generate')}
            </button>
          </div>

          <p className={styles.balanceHint}>
            {t('balance')} <strong>¥{balance ? (balance.available / 100).toFixed(2) : '--'}</strong>
            {isLoggedIn ? '' : ' · ' + t('loginToGenerate')}
          </p>
        </aside>

        {/* ── Right Panel: History ── */}
        <main className={styles.rightPanel}>
          <div className={styles.historyTopbar}>
            <div>
              <span className={styles.historyHeading}>{t('resultHistory')}</span>
              <span className={styles.historyCount}>{history.length} {t('records')}</span>
            </div>
            <div className={styles.historyFilter}>
              {([t('filterAll'), t('filterImage'), t('filterFav')] as const).map((f, i) => {
                const vals = ['all', '图片', '收藏'] as const;
                return <button key={f} className={`${styles.filterBtn} ${filter === vals[i] ? styles.filterBtnActive : ''}`} onClick={() => setFilter(vals[i]!)}>{f}</button>;
              })}
            </div>
          </div>

          <div className={styles.historyGrid}>
            {filtered.map(item => (
              <div key={item.id} className={styles.historyCard}>
                <img className={styles.historyImg} src={item.img} alt={item.prompt} loading="lazy" />
                <div className={styles.historyCardBody}>
                  <span className={styles.historyModelTag}>{item.model}</span>
                  <p className={styles.historyPrompt}>{item.prompt}</p>
                </div>
                <div className={styles.historyCardFooter}>
                  <span className={styles.historyTime}>{item.time}</span>
                  <div className={styles.historyActions}>
                    <button className={styles.histAct}>⬇</button>
                    <button className={styles.histAct}>⭐</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </main>
  );
}
