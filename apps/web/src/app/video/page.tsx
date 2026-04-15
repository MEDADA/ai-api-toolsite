'use client';

import { useState } from 'react';
import { SiteHeader } from '@/components/site-header';
import styles from './page.module.css';

const VIDEO_MODELS = [
  { slug: 'seedance-2-0', name: 'Seedance 2.0', price: '¥3.0/秒' },
  { slug: 'seedance-1-5', name: 'Seedance 1.5', price: '¥1.5/秒' },
  { slug: 'kling-3-0', name: 'Kling 3.0', price: '¥3.0/秒' },
];

const DURATIONS = [3, 5, 10, 15];
const RESOLUTIONS = ['540p', '720p', '1080p'];

export default function VideoPage() {
  const [selectedModel, setSelectedModel] = useState(VIDEO_MODELS[0]);
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState('1080p');
  const [generating, setGenerating] = useState(false);
  const [outputs, setOutputs] = useState<Array<{ url: string; thumbnail?: string }>>([]);

  const estimateCost = () => {
    const price = parseFloat(selectedModel.price.replace('¥', '').replace('/秒', ''));
    return (price * duration).toFixed(2);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    // TODO: Call apiClient.createTask
    setTimeout(() => setGenerating(false), 2000);
  };

  return (
    <main className={styles.main}>
      <SiteHeader />
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>🎬 视频生成</h1>

        {/* Model Selector */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>选择模型</h2>
          <div className={styles.modelRow}>
            {VIDEO_MODELS.map((m) => (
              <button
                key={m.slug}
                className={`${styles.modelBtn} ${selectedModel.slug === m.slug ? styles.active : ''}`}
                onClick={() => setSelectedModel(m)}
              >
                <span>{m.name}</span>
                <span className={styles.price}>{m.price}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Prompt */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>视频描述</h2>
          <textarea
            className={styles.promptInput}
            placeholder="描述你想要生成的视频场景，例如：日落海景，海浪拍打礁石，光影效果"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </section>

        {/* Duration + Resolution */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>时长与画质</h2>
          <div className={styles.optionRow}>
            <div className={styles.optionGroup}>
              <label className={styles.optionLabel}>时长</label>
              <div className={styles.durationBtns}>
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    className={`${styles.durationBtn} ${duration === d ? styles.active : ''}`}
                    onClick={() => setDuration(d)}
                  >
                    {d}秒
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.optionGroup}>
              <label className={styles.optionLabel}>分辨率</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className={styles.select}
              >
                {RESOLUTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Generate */}
        <div className={styles.generateBar}>
          <span className={styles.priceEstimate}>
            预估费用：<strong>¥{estimateCost()}</strong>
          </span>
          <button
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
          >
            {generating ? '⚡ 生成中...' : `🚀 生成视频（¥${estimateCost()}）`}
          </button>
        </div>

        {/* Results */}
        {outputs.length > 0 && (
          <div className={styles.outputGrid}>
            {outputs.map((o, i) => (
              <video key={i} src={o.url} controls className={styles.videoPlayer} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
