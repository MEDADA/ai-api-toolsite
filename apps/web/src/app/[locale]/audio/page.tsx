'use client';
import styles from '../image/page.module.css';
import { SiteHeader } from '@/components/site-header';
import { useLocale } from 'next-intl';
import { useState, useRef, useEffect } from 'react';

const MODES = [
  { id: 'tts', icon: '🎙️', name: 'TTS 文字转语音', desc: '文字转语音，支持多种音色' },
  { id: 'asr', icon: '🎧', name: 'ASR 语音转文字', desc: '语音识别为文字' },
  { id: 'clone', icon: '🔊', name: '声音克隆', desc: '克隆你的专属声音' },
];
const VOICES = ['晓晓（女声）', '云飞（男声）', '小宁（儿童）', '阿波（低沉）'];
const LANGUAGES = ['中文', '英文', '中日', '中英'];

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
  const [modeIdx, setModeIdx] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0]);
  const [voiceDropdownOpen, setVoiceDropdownOpen] = useState(false);
  const [language, setLanguage] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState(HISTORY);
  const voiceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (voiceDropdownRef.current && !voiceDropdownRef.current.contains(e.target as Node)) {
        setVoiceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

          {/* Top bar */}
          <div className={styles.topBar}>
            {/* Mode selector */}
            <div className={styles.modelSelector} ref={voiceDropdownRef}>
              <div className={styles.modelPill} onClick={() => setVoiceDropdownOpen(d => !d)}>
                <span className={styles.modelPillIcon}>{MODES[modeIdx]!.icon}</span>
                <span className={styles.modelPillName}>{MODES[modeIdx]!.name}</span>
                <span style={{ fontSize: 9, color: '#475569' }}>▼</span>
              </div>
              <div className={`${styles.modelDropdown} ${voiceDropdownOpen ? styles.modelDropdownOpen : ''}`}>
                {MODES.map((m, i) => (
                  <div key={m.id} className={`${styles.modelOption} ${i === modeIdx ? styles.modelOptionSelected : ''}`}
                    onClick={() => { setModeIdx(i); setVoiceDropdownOpen(false); }}>
                    <div className={styles.modelOptionLeft}>
                      <span style={{ fontSize: 16 }}>{m.icon}</span>
                      <div>
                        <div className={styles.modelOptionName}>{m.name}</div>
                        <div className={styles.modelOptionDesc}>{m.desc}</div>
                      </div>
                    </div>
                    <span className={styles.modelOptionCheck}>✓</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mode chips */}
            {MODES.map((m, mi) => (
              <button key={m.id} className={`${styles.chip} ${mi === modeIdx ? styles.chipActive : ''}`}
                onClick={() => setModeIdx(mi)}>
                {mi === 0 ? 'TTS' : mi === 1 ? 'ASR' : '克隆'}
              </button>
            ))}

            {/* Language chips */}
            {LANGUAGES.map((l, li) => (
              <button key={l} className={`${styles.chip} ${li === language ? styles.chipActive : ''}`}
                onClick={() => setLanguage(li)}>
                <span className={styles.chipLabel}>语言</span><span className={styles.chipDiv}>·</span><span>{l}</span>
              </button>
            ))}
          </div>

          {/* Voice selector row */}
          <div className={styles.topBar}>
            <div style={{ position: 'relative' }}>
              <div className={styles.modelPill}
                style={{ background: 'rgba(52,211,153,0.12)', borderColor: 'rgba(52,211,153,0.25)' }}
                onClick={() => setVoiceDropdownOpen(d => !d)}>
                <span style={{ fontSize: 13, color: '#34d399' }}>🎵</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#34d399' }}>{selectedVoice}</span>
                <span style={{ fontSize: 9, color: '#475569' }}>▼</span>
              </div>
              <div className={`${styles.modelDropdown} ${voiceDropdownOpen ? styles.modelDropdownOpen : ''}`}
                style={{ zIndex: 200 }}>
                {VOICES.map(v => (
                  <div key={v} className={`${styles.modelOption} ${v === selectedVoice ? styles.modelOptionSelected : ''}`}
                    onClick={() => { setSelectedVoice(v); setVoiceDropdownOpen(false); }}>
                    <div className={styles.modelOptionLeft}>
                      <span style={{ fontSize: 16 }}>🎵</span>
                      <div>
                        <div className={styles.modelOptionName} style={{ color: '#e2e8f0' }}>{v}</div>
                        <div className={styles.modelOptionDesc}>点击试听</div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); alert(`正在试听音色：${v}`); }}
                      style={{
                        background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
                        borderRadius: 6, color: '#34d399', cursor: 'pointer', fontSize: 12,
                        padding: '4px 8px', marginRight: 4,
                      }}
                    >
                      ▶
                    </button>
                    <span className={styles.modelOptionCheck}>✓</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Speed display */}
            <span style={{ fontSize: 11, color: '#475569', marginLeft: 4, whiteSpace: 'nowrap', padding: '5px 0' }}>
              语速 <strong style={{ color: '#34d399' }}>{speed.toFixed(1)}x</strong>
            </span>
          </div>

          {/* Speed slider */}
          <div style={{ marginBottom: 10 }}>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={speed}
              onChange={(e) => setSpeed(parseFloat((e.target as HTMLInputElement).value))}
              style={{
                width: '100%',
                accentColor: '#34d399',
                height: 4,
                borderRadius: 2,
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#374151', fontSize: 10, marginTop: 4 }}>
              <span>慢速 (0.5x)</span>
              <span>正常 (1.0x)</span>
              <span>快速 (2.0x)</span>
            </div>
          </div>

          <div className={styles.coreUnit}>
            <div className={styles.promptBox}>
              <textarea className={styles.promptTextarea}
                placeholder={modeIdx === 0 ? '输入要转换的文字...' : modeIdx === 1 ? '上传或录制语音...' : '输入要克隆的参考文字...'}
                value={text}
                onChange={e => setText(e.target.value)}
              />
              <div className={styles.promptFooter}>
                <span />
                <span className={styles.charCount}>{text.length} / 5000</span>
              </div>
            </div>
            <button className={styles.generateBtnGreen} onClick={handleGenerate}
              disabled={isGenerating || !text.trim()}>
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
              {['全部','TTS','ASR','收藏'].map((f,i) => (
                <button key={f} className={`${styles.filterBtn} ${i===0 ? styles.filterBtnActive + ' ' + styles.audioGreen : ''}`}>{f}</button>
              ))}
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
