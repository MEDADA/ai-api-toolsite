'use client';

import styles from './page.module.css';
import { SiteHeader } from '@/components/site-header';
import { useTranslations, useLocale } from 'next-intl';
import { useState, useRef, useEffect } from 'react';

const MODELS = [
  { id: 'flux-schnell', icon: '⚡', name: 'FLUX.2 schnell', desc: '快速 · 写实/动漫', price: '¥0.5/张' },
  { id: 'wanxiang-26', icon: '🔥', name: '万相 2.6', desc: '高质量 · 中文理解强', price: '¥0.5/张' },
  { id: 'flux-dev', icon: '✨', name: 'FLUX.2 dev', desc: '顶配 · 细节极致', price: '¥1.2/张' },
];

const SIZES = ['512²', '768²', '1024²', '9:16'];
const QUALITIES = ['⚡快速', '✨标准', '🔥高质量'];
const COUNTS = ['1张', '2张', '4张'];

const HISTORY_ITEMS = [
  { id: '1', model: 'FLUX.2 schnell · 1024²', prompt: '一只穿着宇航服的橘猫，在月球表面仰望地球，赛博朋克风格', time: '刚刚', img: 'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=500&q=75', tag: '图片' },
  { id: '2', model: '万相 2.6 · 1024²', prompt: '未来城市夜景，霓虹灯光', time: '2 分钟前', img: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500&q=75', tag: '图片' },
  { id: '3', model: 'FLUX.2 dev · 512²', prompt: '渐变抽象艺术', time: '5 分钟前', img: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=500&q=75', tag: '图片' },
  { id: '4', model: '万相 2.6 · 9:16', prompt: '油画风格，日落海景', time: '8 分钟前', img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=75', tag: '图片' },
  { id: '5', model: 'FLUX.2 schnell · 512²', prompt: '极简黑白建筑', time: '12 分钟前', img: 'https://images.unsplash.com/photo-1614850715649-1d0106293bd1?w=500&q=75', tag: '图片' },
  { id: '6', model: 'FLUX.2 dev · 1024²', prompt: 'AI 神经网络可视化', time: '20 分钟前', img: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=500&q=75', tag: '图片' },
];

const PLACEHOLDER = '';

export default function ImagePage() {
  const t = useTranslations('image');
  const tf = useTranslations('footer');
  const locale = useLocale();
  const L = (path: string) => `/${locale}${path}`;

  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedSize, setSelectedSize] = useState(2);
  const [selectedQuality, setSelectedQuality] = useState(1);
  const [selectedCount, setSelectedCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState(HISTORY_ITEMS);
  const [filter, setFilter] = useState('all');
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

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);

    // TODO: connect to real API
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsGenerating(false);
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
                {i === 0 && SIZES.map((s, si) => (
                  <button key={s} className={`${styles.chip} ${si === selectedSize ? styles.chipActive : ''}`}
                    onClick={() => setSelectedSize(si)}>
                    <span className={styles.chipLabel}>{label}</span>
                    <span className={styles.chipDiv}>·</span>
                    <span>{s}</span>
                  </button>
                ))}
                {i === 1 && QUALITIES.map((q, qi) => (
                  <button key={q} className={`${styles.chip} ${qi === selectedQuality ? styles.chipActive : ''}`}
                    onClick={() => setSelectedQuality(qi)}>
                    <span className={styles.chipLabel}>{label}</span>
                    <span className={styles.chipDiv}>·</span>
                    <span>{q}</span>
                  </button>
                ))}
                {i === 2 && COUNTS.map((c, ci) => (
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
                  <span className={styles.spinner} /> {t('generating')}
                </span>
              ) : '🎨 ' + t('generate')}
            </button>
          </div>

          <p className={styles.balanceHint}>{t('balance')} <strong>¥9.50</strong> · {t('estimate')} ¥0.50</p>
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
