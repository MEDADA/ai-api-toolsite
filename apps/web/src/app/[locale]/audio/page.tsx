'use client';
import styles from './page.module.css';
import { SiteHeader } from '@/components/site-header';
import { useTranslations, useLocale } from 'next-intl';
import { useState } from 'react';

const MODES = ['TTS 文字转语音', 'ASR 语音转文字', '声音克隆'];
const VOICES = ['晓晓（女声）', '云飞（男声）', '小宁（儿童）', '阿波（低沉）'];
const LANGUAGES = ['中文', '英文', '中日', '中英'];
const SPEEDS = ['0.8x', '1.0x', '1.2x', '1.5x'];

const HISTORY = [
  { id: '1', type: 'TTS · 晓晓', text: '欢迎使用 AI 语音合成服务，支持多种音色和语言切换', time: '刚刚', duration: '12s', playing: false },
  { id: '2', type: 'TTS · 云飞', text: 'The future of AI content creation is here', time: '5 分钟前', duration: '8s', playing: false },
  { id: '3', type: '声音克隆', text: '这是一段用你声音克隆生成的语音内容', time: '20 分钟前', duration: '15s', playing: false },
];

function Waveform() {
  const bars = Array.from({ length: 40 }, (_, i) => Math.random() * 30 + 5);
  return (
    <div className={styles.waveform}>
      {bars.map((h, i) => (
        <div key={i} className={styles.waveformBar} style={{ height: `${h}px`, background: i < 8 ? 'rgba(52,211,153,0.7)' : 'rgba(52,211,153,0.3)' }} />
      ))}
    </div>
  );
}

export default function AudioPage() {
  const locale = useLocale();
  const [mode, setMode] = useState(0);
  const [voice, setVoice] = useState(0);
  const [language, setLanguage] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState(HISTORY);

  const handleGenerate = async () => {
    if (!text.trim() || isGenerating) return;
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
            <div className={styles.modelPill}>
              <span className={styles.modelPillIcon}>🎙️</span>
              <span className={styles.modelPillName}>{MODES[mode]}</span>
            </div>
            {MODES.map((m, mi) => (
              <button key={m} className={`${styles.chip} ${mi === mode ? styles.chipActive : ''}`} onClick={() => setMode(mi)}>
                {mi === 0 ? 'TTS' : mi === 1 ? 'ASR' : '克隆'}
              </button>
            ))}
          </div>

          <div className={styles.topBar}>
            {['音色', '语言'].map((label, i) => (
              <div key={label} style={{ display: 'flex', gap: 4 }}>
                {label === '音色' && VOICES.map((v, vi) => (
                  <button key={v} className={`${styles.chip} ${vi === voice ? styles.chipActive : ''}`} onClick={() => setVoice(vi)}>
                    <span className={styles.chipLabel}>{label}</span><span className={styles.chipDiv}>·</span><span>{v.slice(0,2)}</span>
                  </button>
                ))}
                {label === '语言' && LANGUAGES.map((l, li) => (
                  <button key={l} className={`${styles.chip} ${li === language ? styles.chipActive : ''}`} onClick={() => setLanguage(li)}>
                    <span className={styles.chipLabel}>{label}</span><span className={styles.chipDiv}>·</span><span>{l}</span>
                  </button>
                ))}
              </div>
            ))}
            {SPEEDS.map((s, si) => (
              <button key={s} className={`${styles.chip} ${si === speed ? styles.chipActive : ''}`} onClick={() => setSpeed(si)}>
                <span className={styles.chipLabel}>语速</span><span className={styles.chipDiv}>·</span><span>{s}</span>
              </button>
            ))}
          </div>

          <div className={styles.coreUnit}>
            <div className={styles.promptBox}>
              <textarea className={styles.promptTextarea} placeholder={mode === 0 ? '输入要转换的文字...' : mode === 1 ? '上传或录制语音...' : '输入要克隆的参考文字...'} value={text} onChange={e => setText(e.target.value)} />
              <div className={styles.promptFooter}><span /><span className={styles.charCount}>{text.length} / 5000</span></div>
            </div>
            <button className={styles.generateBtn} onClick={handleGenerate} disabled={isGenerating || !text.trim()}>
              {isGenerating ? <><span className={styles.spinner} /> 生成中…</> : '🎙️ 开始生成'}
            </button>
          </div>
          <p className={styles.balanceHint}>余额 <strong>¥9.50</strong> · 预估 ¥0.30</p>
        </aside>

        {/* Right */}
        <main className={styles.rightPanel}>
          <div className={styles.historyTopbar}>
            <div><span className={styles.historyHeading}>生成历史</span><span className={styles.historyCount}>{history.length} 条</span></div>
            <div className={styles.historyFilter}>
              {['全部','TTS','ASR','收藏'].map((f,i) => <button key={f} className={`${styles.filterBtn} ${i===0 ? styles.filterBtnActive : ''}`}>{f}</button>)}
            </div>
          </div>
          <div className={styles.audioList}>
            {history.map(item => (
              <div key={item.id} className={styles.audioCard}>
                <div className={styles.audioPlayer}>
                  <button className={styles.playBtn}>▶</button>
                  <Waveform />
                  <span className={styles.audioDuration}>{item.duration}</span>
                </div>
                <div className={styles.audioBody}>
                  <span className={styles.audioTag}>{item.type}</span>
                  <p className={styles.audioText}>{item.text}</p>
                </div>
                <div className={styles.audioFooter}>
                  <span className={styles.audioTime}>{item.time}</span>
                  <div className={styles.audioActions}>
                    <button className={styles.audioAct}>⬇ 下载</button>
                    <button className={styles.audioAct}>⭐</button>
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
