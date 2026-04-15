'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import styles from './page.module.css';

const MODELS = [
  { slug: 'flux-2-schnell', name: 'FLUX.2 schnell', price: '¥0.5/张', speed: '⚡ 快速' },
  { slug: 'flux-2-dev', name: 'FLUX.2 dev', price: '¥1.2/张', speed: '🔥 高质量' },
  { slug: 'wanxiang-2-6', name: '万相 2.6', price: '¥0.5/张', speed: '✨ 阿里云' },
];

export default function ImagePage() {
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [prompt, setPrompt] = useState('');
  const [width, setWidth] = useState('1024');
  const [height, setHeight] = useState('1024');
  const [imageCount, setImageCount] = useState(1);
  const [steps, setSteps] = useState('standard');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<Array<{ url: string; thumbnail?: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('请输入图片描述');
      return;
    }

    setGenerating(true);
    setError(null);
    setOutputs([]);

    try {
      // TODO: Call apiClient.createTask
      // For now, simulate task creation
      setError('⚠️ API 尚未连接，请先启动后端服务');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className={styles.main}>
      <SiteHeader />

      <div className={styles.container}>
        {/* Model Selector */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>选择模型</h2>
          <div className={styles.modelRow}>
            {MODELS.map((m) => (
              <button
                key={m.slug}
                className={`${styles.modelBtn} ${selectedModel.slug === m.slug ? styles.active : ''}`}
                onClick={() => setSelectedModel(m)}
              >
                <span className={styles.modelBtnName}>{m.name}</span>
                <span className={styles.modelBtnPrice}>{m.price}</span>
                <span className={styles.modelBtnSpeed}>{m.speed}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Prompt Input */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>图片描述</h2>
          <textarea
            className={styles.promptInput}
            placeholder="描述你想要生成的图片，例如：一只橘色的猫在草地上奔跑，超写实风格"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={2000}
            rows={4}
          />
          <div className={styles.charCount}>{prompt.length}/2000</div>
        </section>

        {/* Size & Options */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>尺寸与参数</h2>
          <div className={styles.optionsGrid}>
            <div className={styles.optionGroup}>
              <label className={styles.optionLabel}>宽度</label>
              <select value={width} onChange={(e) => setWidth(e.target.value)} className={styles.select}>
                <option value="512">512px</option>
                <option value="1024">1024px</option>
                <option value="1080">1080px</option>
              </select>
            </div>
            <div className={styles.optionGroup}>
              <label className={styles.optionLabel}>高度</label>
              <select value={height} onChange={(e) => setHeight(e.target.value)} className={styles.select}>
                <option value="512">512px</option>
                <option value="1024">1024px</option>
                <option value="1920">1920px (竖版)</option>
              </select>
            </div>
            <div className={styles.optionGroup}>
              <label className={styles.optionLabel}>张数</label>
              <select value={imageCount} onChange={(e) => setImageCount(Number(e.target.value))} className={styles.select}>
                <option value={1}>1 张</option>
                <option value={2}>2 张</option>
                <option value={4}>4 张</option>
              </select>
            </div>
            <div className={styles.optionGroup}>
              <label className={styles.optionLabel}>质量档位</label>
              <select value={steps} onChange={(e) => setSteps(e.target.value)} className={styles.select}>
                <option value="fast">快速</option>
                <option value="standard">标准</option>
                <option value="high">高质量</option>
              </select>
            </div>
          </div>

          {/* Reference Image (optional) */}
          <div className={styles.optionGroup} style={{ marginTop: 16 }}>
            <label className={styles.optionLabel}>参考图 URL（可选，图生图）</label>
            <input
              type="url"
              className={styles.textInput}
              placeholder="https://..."
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
            />
          </div>
        </section>

        {/* Generate Button */}
        <div className={styles.generateBar}>
          <div className={styles.priceEstimate}>
            预估费用：<strong>¥{((selectedModel.price.match(/[\d.]+/)?.[0] ?? '0.5') as unknown as number) * imageCount}</strong>
          </div>
          {error && <span className={styles.errorMsg}>{error}</span>}
          <button
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? '⚡ 生成中...' : `🚀 生成图片（¥${((selectedModel.price.match(/[\d.]+/)?.[0] ?? '0.5') as unknown as number) * imageCount}）`}
          </button>
        </div>

        {/* Results */}
        {outputs.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>生成结果</h2>
            <div className={styles.outputGrid}>
              {outputs.map((o, i) => (
                <div key={i} className={styles.outputItem}>
                  <img src={o.url} alt={`Generated ${i + 1}`} className={styles.outputImg} />
                  <a href={o.url} download className={styles.downloadBtn}>下载</a>
                </div>
              ))}
            </div>
          </section>
        )}

        {taskId && !outputs.length && !generating && (
          <div className={styles.waitingState}>
            <p>任务已创建，请稍候...</p>
            <Link href={`/dashboard`} className={styles.link}>查看进度 →</Link>
          </div>
        )}
      </div>
    </main>
  );
}
