'use client';

import { useState } from 'react';
import { SiteHeader } from '@/components/site-header';
import styles from './page.module.css';

const TABS = ['TTS 文字转语音', 'ASR 语音转文字', '声音克隆'] as const;

const VOICES = [
  { value: 'female_young', label: '🎀 甜美女声' },
  { value: 'female_mature', label: '👩 成熟女声' },
  { value: 'male_young', label: '🎧 清新男声' },
  { value: 'male_mature', label: '🎤 磁性男声' },
  { value: 'child', label: '🧒 童声' },
];

export default function AudioPage() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('TTS 文字转语音');
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('female_young');
  const [speed, setSpeed] = useState(1.0);
  const [generating, setGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const estimateCost = () => {
    if (activeTab === 'TTS 文字转语音') {
      const chars = text.length;
      return ((chars / 1000) * 0.3).toFixed(2);
    }
    return '0.00';
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setGenerating(true);
    // TODO: Call apiClient.createTask
    setTimeout(() => setGenerating(false), 2000);
  };

  return (
    <main className={styles.main}>
      <SiteHeader />
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>🎙️ 语音生成</h1>

        {/* Tabs */}
        <div className={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* TTS */}
        {activeTab === 'TTS 文字转语音' && (
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>选择音色</h2>
              <div className={styles.voiceGrid}>
                {VOICES.map((v) => (
                  <button
                    key={v.value}
                    className={`${styles.voiceBtn} ${voice === v.value ? styles.active : ''}`}
                    onClick={() => setVoice(v.value)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>输入文本</h2>
              <textarea
                className={styles.textInput}
                placeholder="输入要转换的文字，例如：欢迎使用 AI 工具站，一站式生成优质内容"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={5000}
                rows={5}
              />
              <div className={styles.charCount}>{text.length}/5000</div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>语速</h2>
              <div className={styles.speedControl}>
                <span className={styles.speedLabel}>慢</span>
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className={styles.slider}
                />
                <span className={styles.speedLabel}>快</span>
                <span className={styles.speedValue}>{speed.toFixed(1)}x</span>
              </div>
            </section>
          </>
        )}

        {activeTab === 'ASR 语音转文字' && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>上传音频</h2>
            <div className={styles.uploadArea}>
              <p className={styles.uploadHint}>拖拽或点击上传音频文件（MP3/WAV）</p>
              <p className={styles.uploadPrice}>¥0.5/分钟</p>
            </div>
          </section>
        )}

        {activeTab === '声音克隆' && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>上传参考音频</h2>
            <div className={styles.uploadArea}>
              <p className={styles.uploadHint}>上传 10-60 秒清晰人声音频</p>
              <p className={styles.uploadPrice}>¥2.0/次</p>
            </div>
            <h2 className={styles.sectionTitle} style={{ marginTop: 24 }}>输入克隆文本</h2>
            <textarea
              className={styles.textInput}
              placeholder="输入要克隆音色说的文本"
              maxLength={500}
              rows={3}
            />
          </section>
        )}

        {/* Generate */}
        <div className={styles.generateBar}>
          <span className={styles.priceEstimate}>
            预估费用：<strong>¥{estimateCost()}</strong>
          </span>
          <button
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={generating || !text.trim()}
          >
            {generating ? '⚡ 生成中...' : `🚀 开始生成（¥${estimateCost()}）`}
          </button>
        </div>

        {/* Result */}
        {resultUrl && (
          <div className={styles.resultArea}>
            <audio src={resultUrl} controls className={styles.audioPlayer} />
            <a href={resultUrl} download className={styles.downloadBtn}>下载音频</a>
          </div>
        )}
      </div>
    </main>
  );
}
