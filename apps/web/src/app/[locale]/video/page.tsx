'use client';
import styles from './page.module.css';
import { SiteHeader } from '@/components/site-header';
import { useLocale } from 'next-intl';
import { useState, useCallback, useRef } from 'react';

const MODELS = [
  { id: 'seedance', icon: '🎬', name: 'Seedance 1.5 Pro', desc: '高质量 · 中文理解强', price: '¥1.5/秒' },
  { id: 'kling-3', icon: '⚡', name: 'Kling 3.0', desc: '极速 · 电商场景', price: '¥2.0/秒' },
];
const DURATIONS = ['5秒', '10秒', '15秒'];
const RESOLUTIONS = ['720p', '1080p'];
const CAMERAS = ['固定', '环绕', '推进', '平移'];

interface HistoryItem {
  id: string; model: string; prompt: string; time: string;
  img: string; status?: 'generating' | 'completed';
}

export default function VideoPage() {
  const locale = useLocale();
  const [mode, setMode] = useState<'text2vid' | 'img2vid'>('text2vid');
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [duration, setDuration] = useState(0);
  const [resolution, setResolution] = useState(0);
  const [camera, setCamera] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [initImage, setInitImage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      // Upload to our OSS endpoint (or use local data URL as fallback)
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
    if (!prompt.trim() || isGenerating) return;

    const token = localStorage.getItem('access_token');
    if (!token) { alert('请先登录'); return; }

    const tempId = `temp_${Date.now()}`;
    const durationSec = [5, 10, 15][duration];

    const genCard: HistoryItem = {
      id: tempId, model: selectedModel!.name, prompt,
      time: '生成中…', img: '', status: 'generating',
    };
    setHistory(prev => [genCard, ...prev]);
    setIsGenerating(true);

    try {
      const body: Record<string, unknown> = {
        model_slug: 'doubao-seedance-1.5-pro',
        prompt,
        duration: durationSec,
        resolution: RESOLUTIONS[resolution],
      };
      if (mode === 'img2vid' && initImage) {
        body.init_image = initImage;
      }

      const res = await fetch('http://localhost:3002/api/v1/tasks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || '创建任务失败');

      const { task_id, stream_url } = json.data;
      const actualStreamUrl = `http://localhost:3002${stream_url}`;

      const es = new EventSource(actualStreamUrl);

      es.addEventListener('task_processing', () => {
        setHistory(prev => prev.map(h => h.id === tempId ? { ...h, time: '处理中…' } : h));
      });

      es.addEventListener('task_completed', (e) => {
        const data = JSON.parse(e.data);
        const videoUrl = data.outputs?.[0]?.url;
        setHistory(prev => prev.map(h => h.id === tempId ? {
          ...h, id: task_id, img: videoUrl || '', status: 'completed', time: '刚刚',
        } : h));
        setIsGenerating(false);
        es.close();
      });

      es.addEventListener('task_failed', (e) => {
        const data = JSON.parse(e.data);
        setHistory(prev => prev.filter(h => h.id !== tempId));
        setIsGenerating(false);
        alert(`生成失败: ${data.error}`);
        es.close();
      });

      es.onerror = () => { es.close(); setIsGenerating(false); };

    } catch (err: any) {
      setHistory(prev => prev.filter(h => h.id !== tempId));
      setIsGenerating(false);
      alert(err.message);
    }
  }, [prompt, isGenerating, selectedModel, duration, resolution, initImage, mode, RESOLUTIONS]);

  return (
    <main style={{ minHeight: '100vh', background: '#08080f' }}>
      <SiteHeader />
      <div className={styles.layout}>

        {/* Left */}
        <aside className={styles.leftPanel}>
          {/* Mode toggle */}
          <div className={styles.modeToggle}>
            {(['text2vid', 'img2vid'] as const).map(m => (
              <button key={m} className={`${styles.modeBtn} ${mode === m ? styles.modeBtnActive : ''}`}
                onClick={() => setMode(m)}>
                {m === 'text2vid' ? '✍️ 文生视频' : '🖼️ 图生视频'}
              </button>
            ))}
          </div>

          {/* Image upload for img2vid */}
          {mode === 'img2vid' && (
            <div className={styles.imageUpload} onClick={() => fileInputRef.current?.click()}>
              {uploading ? (
                <span className={styles.uploadSpinner} />
              ) : initImage ? (
                <div className={styles.imagePreview}>
                  <img src={initImage} alt="参考图" className={styles.previewImg} />
                  <div className={styles.previewOverlay}>
                    <span>点击更换</span>
                  </div>
                </div>
              ) : (
                <div className={styles.uploadPlaceholder}>
                  <span className={styles.uploadIcon}>📷</span>
                  <span className={styles.uploadText}>上传参考图片</span>
                  <span className={styles.uploadHint}>支持 JPG/PNG，建议 16:9</span>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className={styles.hiddenInput}
                onChange={handleFileChange} />
              {initImage && (
                <button className={styles.clearImage} onClick={e => { e.stopPropagation(); setInitImage(''); }}>✕</button>
              )}
            </div>
          )}

          <div className={styles.topBar}>
            <div className={styles.modelPill} onClick={() => setSelectedModel(selectedModel!.id === 'seedance' ? MODELS[1] : MODELS[0])}>
              <span className={styles.modelPillIcon}>{selectedModel!.icon}</span>
              <span className={styles.modelPillName}>{selectedModel!.name}</span>
            </div>
            {['时长', '分辨率'].map((label) => (
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
              <textarea className={styles.promptTextarea}
                placeholder={mode === 'img2vid' ? '描述你想要的视频运动效果… 例如：镜头向前推进，场景缓慢变化' : '描述你想要的视频场景… 例如：无人机穿越峡谷，极速飞行体验'}
                value={prompt} onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate(); }}
              />
              <div className={styles.promptFooter}><span /><span className={styles.charCount}>{prompt.length} / 1000</span></div>
            </div>
            <button className={styles.generateBtn} onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || (mode === 'img2vid' && !initImage)}>
              {isGenerating ? <><span className={styles.spinner} /> 生成中…</> : mode === 'img2vid' ? '🎬 图生视频' : '🎬 开始生成'}
            </button>
          </div>
          <p className={styles.balanceHint}>
            {mode === 'img2vid' ? '💡 图生视频效果更可控' : '余额 <strong>¥4.84</strong> · 预估 ¥'}{[5,10,15][duration]! * 1.5}
          </p>
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
              item.status === 'generating' ? (
                <div key={item.id} className={`${styles.historyCard} ${styles.generatingCard}`}>
                  <div className={styles.genHeader}><span className={styles.genLabel}>🎬 生成中</span></div>
                  <div className={styles.genPrompt}>{item.prompt}</div>
                  <div className={styles.genProgressTrack}><div className={styles.genProgressBar} style={{ width: '60%' }} /></div>
                </div>
              ) : (
                <div key={item.id} className={styles.historyCard} onClick={() => window.open(item.img, '_blank')}>
                  <img className={styles.historyThumb} src={item.img} alt={item.prompt} loading="lazy" />
                  <div className={styles.historyBody}>
                    <span className={styles.historyTag}>{item.model}</span>
                    <p className={styles.historyPrompt}>{item.prompt}</p>
                  </div>
                  <div className={styles.historyFooter}>
                    <span className={styles.historyTime}>{item.time}</span>
                    <div className={styles.historyActions}>
                      <button className={styles.histAct} onClick={e => { e.stopPropagation(); window.open(item.img, '_blank'); }}>⬇</button>
                      <button className={styles.histAct}>⭐</button>
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
