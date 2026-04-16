'use client';
import styles from './page.module.css';
import { SiteHeader } from '@/components/site-header';
import { useTranslations, useLocale } from 'next-intl';
import { useState } from 'react';

const MODELS = [
  { id: 'seedance', icon: '🎬', name: 'Seedance 1.5 Pro', desc: '高质量 · 中文理解强', price: '¥1.5/秒' },
  { id: 'kling-3', icon: '⚡', name: 'Kling 3.0', desc: '极速 · 电商场景', price: '¥2.0/秒' },
];
const DURATIONS = ['5秒', '10秒', '15秒'];
const RESOLUTIONS = ['720p', '1080p'];
const CAMERAS = ['固定镜头', '环绕', '推进', '平移'];

const HISTORY = [
  { id: '1', model: 'Seedance 1.5 Pro · 720p · 5秒', prompt: '无人机穿越峡谷，沉浸式飞行体验', time: '刚刚', img: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500&q=75' },
  { id: '2', model: 'Seedance 1.5 Pro · 1080p · 10秒', prompt: '日落海边冲浪，慢动作', time: '3 分钟前', img: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=500&q=75' },
  { id: '3', model: 'Kling 3.0 · 720p · 5秒', prompt: '城市街道延时摄影', time: '8 分钟前', img: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=500&q=75' },
  { id: '4', model: 'Seedance 1.5 Pro · 720p · 5秒', prompt: '枫叶飘落秋天', time: '15 分钟前', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=75' },
];

export default function VideoPage() {
  const locale = useLocale();
  const L = (path: string) => `/${locale}${path}`;
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [duration, setDuration] = useState(0);
  const [resolution, setResolution] = useState(0);
  const [camera, setCamera] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState(HISTORY);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 3000));
    setIsGenerating(false);
  };

  return (
    <main style={{ minHeight: '100vh', background: '#08080f' }}>
      <SiteHeader />
      <div className={styles.layout}>

        {/* Left */}
        <aside className={styles.leftPanel}>
          <div className={styles.topBar}>
            <div className={styles.modelPill} onClick={() => setSelectedModel(selectedModel!.id === 'seedance' ? MODELS[1] : MODELS[0])}>
              <span className={styles.modelPillIcon}>{selectedModel!.icon}</span>
              <span className={styles.modelPillName}>{selectedModel!.name}</span>
            </div>
            {['时长', '分辨率'].map((label, i) => (
              <div key={label} style={{ display: 'flex', gap: 4 }}>
                {label === '时长' && DURATIONS.map((d, di) => (
                  <button key={d} className={`${styles.chip} ${di === duration ? styles.chipActive : ''}`} onClick={() => setDuration(di)}>
                    <span className={styles.chipLabel}>{label}</span><span className={styles.chipDiv}>·</span><span>{d}</span>
                  </button>
                ))}
                {label === '分辨率' && RESOLUTIONS.map((r, ri) => (
                  <button key={r} className={`${styles.chip} ${ri === resolution ? styles.chipActive : ''}`} onClick={() => setResolution(ri)}>
                    <span className={styles.chipLabel}>{label}</span><span className={styles.chipDiv}>·</span><span>{r}</span>
                  </button>
                ))}
              </div>
            ))}
            {CAMERAS.map((c, ci) => (
              <button key={c} className={`${styles.chip} ${ci === camera ? styles.chipActive : ''}`} onClick={() => setCamera(ci)}>
                <span className={styles.chipLabel}>镜头</span><span className={styles.chipDiv}>·</span><span>{c}</span>
              </button>
            ))}
          </div>

          <div className={styles.coreUnit}>
            <div className={styles.promptBox}>
              <textarea className={styles.promptTextarea} placeholder="描述你想要的视频场景... 例如：无人机穿越峡谷，极速飞行体验" value={prompt} onChange={e => setPrompt(e.target.value)} />
              <div className={styles.promptFooter}><span /><span className={styles.charCount}>{prompt.length} / 1000</span></div>
            </div>
            <button className={styles.generateBtn} onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
              {isGenerating ? <><span className={styles.spinner} /> 生成中…</> : '🎬 开始生成'}
            </button>
          </div>
          <p className={styles.balanceHint}>余额 <strong>¥9.50</strong> · 预估 ¥{DURATIONS[duration]!.replace('秒','')}</p>
        </aside>

        {/* Right */}
        <main className={styles.rightPanel}>
          <div className={styles.historyTopbar}>
            <div><span className={styles.historyHeading}>生成历史</span><span className={styles.historyCount}>{history.length} 条</span></div>
            <div className={styles.historyFilter}>
              {['全部','视频','收藏'].map((f,i) => <button key={f} className={`${styles.filterBtn} ${i===0 ? styles.filterBtnActive : ''}`}>{f}</button>)}
            </div>
          </div>
          <div className={styles.historyGrid}>
            {history.map(item => (
              <div key={item.id} className={styles.historyCard}>
                <img className={styles.historyThumb} src={item.img} alt={item.prompt} loading="lazy" />
                <div className={styles.historyBody}>
                  <span className={styles.historyTag}>{item.model}</span>
                  <p className={styles.historyPrompt}>{item.prompt}</p>
                </div>
                <div className={styles.historyFooter}>
                  <span className={styles.historyTime}>{item.time}</span>
                  <div className={styles.historyActions}>
                    <button className={styles.histAct}>⬇</button><button className={styles.histAct}>⭐</button>
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
