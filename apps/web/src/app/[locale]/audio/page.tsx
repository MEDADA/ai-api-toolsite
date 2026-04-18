'use client';
import styles from '../image/page.module.css';
import { SiteHeader } from '@/components/site-header';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

const MODES = [
  { id: 'tts', icon: '🎙️', name: 'TTS 文字转语音', desc: '文字转语音，支持多种音色' },
  { id: 'asr', icon: '🎧', name: 'ASR 语音转文字', desc: '语音识别为文字' },
  { id: 'clone', icon: '🔊', name: '声音克隆', desc: '克隆你的专属声音' },
];
const VOICES = ['晓晓（女声）', '云飞（男声）', '小宁（儿童）', '阿波（低沉）'];
const LANGUAGES = ['中文', '英文', '中日', '中英'];

interface AudioHistoryItem {
  id: string;
  type: string;
  text: string;
  time: string;
  duration: string;
  playing?: boolean;
  audioUrl?: string;
  status?: 'generating' | 'completed' | 'failed';
  model?: string;
  img?: string;
}

function Waveform() {
  const [bars, setBars] = useState<number[]>([]);
  useEffect(() => {
    setBars(Array.from({ length: 40 }, () => Math.random() * 30 + 5));
  }, []);
  return (
    <div className={styles.waveform}>
      {bars.map((h, i) => (
        <div key={i} className={styles.waveformBar} style={{ height: `${h}px`, background: i < 8 ? 'rgba(52,211,153,0.7)' : 'rgba(52,211,153,0.3)' }} />
      ))}
    </div>
  );
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

export default function AudioPage() {
  const t = useTranslations('audio');
  const locale = useLocale();
  const { isLoggedIn } = useAuth();

  // Load history from API on mount
  useEffect(() => {
    if (!isLoggedIn) return;
    apiClient.tasks.list({ type: 'AUDIO', page: 1, page_size: 50 }).then(res => {
      const items: AudioHistoryItem[] = (res.tasks || [])
        .filter(t => t.status === 'SUCCEEDED')
        .map((t) => {
          const outputs = t.outputs || [];
          const first = outputs[0] || {};
          const inputParams = (t.input_params || {}) as { prompt?: string };
          return {
            id: t.id,
            type: t.task_type || 'AUDIO',
            text: inputParams.prompt || '',
            time: formatTime(t.created_at),
            duration: (first as { duration?: number }).duration ? `${(first as { duration?: number }).duration}s` : '—',
            audioUrl: (first as { url?: string }).url || '',
            status: 'completed' as const,
          };
        });
      if (items.length > 0) setHistory(items);
    }).catch(() => {});
  }, [isLoggedIn]);

  const { success, info } = useToast();
  const [modeIdx, setModeIdx] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0]);
  const [voiceDropdownOpen, setVoiceDropdownOpen] = useState(false);
  const [language, setLanguage] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<AudioHistoryItem[]>([]);
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

  const handleGenerate = useCallback(async () => {
    if (!text.trim() || isGenerating) return;
    if (!isLoggedIn) { info('请先登录'); return; }

    const tempId = `temp_${Date.now()}`;
    const modeId = MODES[modeIdx]!.id;

    const genCard: AudioHistoryItem = {
      id: tempId,
      type: `${modeId.toUpperCase()} · ${selectedVoice}`,
      text,
      time: '生成中…',
      duration: '—',
      status: 'generating',
    };
    setHistory(prev => [genCard, ...prev]);
    setIsGenerating(true);

    try {
      const result = await apiClient.tasks.create({
        type: modeId,
        prompt: text,
        model: selectedVoice,
        speed,
        language: LANGUAGES[language],
      });

      const task_id = result.task_id;
      setHistory(prev => prev.map(h => h.id === tempId ? { ...h, time: '处理中…' } : h));

      // Poll every 2s
      const poll = setInterval(async () => {
        try {
          const task = await apiClient.tasks.get(task_id);
          const st = task.status;
          if (st === 'SUCCEEDED') {
            clearInterval(poll);
            const audioUrl = (task.outputs as Array<{url?:string; duration?:string|number}>)?.[0]?.url || '';
            const dur = (task.outputs as Array<{duration?:string|number}>)?.[0]?.duration;
            const duration = dur ? (typeof dur === 'number' ? `${dur}s` : dur) : '—';
            setHistory(prev => prev.map(h => h.id === tempId ? {
              ...h, id: task_id, audioUrl, duration, status: 'completed', time: '刚刚',
            } : h));
            setIsGenerating(false);
          } else if (st === 'FAILED') {
            clearInterval(poll);
            setHistory(prev => prev.filter(h => h.id !== tempId));
            setIsGenerating(false);
            info('生成失败，请稍后重试');
          }
        } catch { /* poll errors non-fatal */ }
      }, 2000);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '生成失败';
      setHistory(prev => prev.filter(h => h.id !== tempId));
      setIsGenerating(false);
      info(msg);
    }
  }, [text, isGenerating, modeIdx, selectedVoice, speed, language, LANGUAGES]);

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
                {mi === 0 ? t('chipTts') : mi === 1 ? t('chipAsr') : t('chipClone')}
              </button>
            ))}

            {/* Language chips */}
            {LANGUAGES.map((l, li) => (
              <button key={l} className={`${styles.chip} ${li === language ? styles.chipActive : ''}`}
                onClick={() => setLanguage(li)}>
                <span className={styles.chipLabel}>{t('language')}</span><span className={styles.chipDiv}>·</span><span>{l}</span>
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
              {t('speed')} <strong style={{ color: '#34d399' }}>{speed.toFixed(1)}x</strong>
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
              <span>{t('speedSlow')}</span>
              <span>{t('speedNormal')}</span>
              <span>{t('speedFast')}</span>
            </div>
          </div>

          <div className={styles.coreUnit}>
            <div className={styles.promptBox}>
              <textarea className={styles.promptTextarea}
                placeholder={modeIdx === 0 ? t('placeholderTts') : modeIdx === 1 ? t('placeholderAsr') : t('placeholderClone')}
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
              {isGenerating ? <><span className={styles.spinner} /> {t('generating')}</> : '🎙️ ' + t('generate')}
            </button>
          </div>
          <p className={styles.balanceHint}>{t('balance')} <strong>¥9.50</strong> · {t('estimate')} ¥0.30</p>
        </aside>

        {/* Right */}
        <main className={`${styles.rightPanel} ${styles.rightPanelOpen}`}>
          <div className={styles.historyTopbar}>
            <div><span className={styles.historyHeading}>{t('history')}</span><span className={styles.historyCount}>{history.length} {t('records')}</span></div>
            <div className={styles.historyFilter}>
              {[t('filterAll'), t('filterTts'), t('filterAsr'), t('filterFav')].map((f,i) => (
                <button key={f} className={`${styles.filterBtn} ${i===0 ? styles.filterBtnActive + ' ' + styles.audioGreen : ''}`}>{f}</button>
              ))}
            </div>
          </div>
          <div className={styles.audioList}>
            {history.map(item => (
              <div key={item.id} className={styles.audioCard}>
                <div className={styles.audioPlayer}>
                  <button className={styles.playBtn}
                    onClick={() => { if (item.audioUrl) window.open(item.audioUrl, '_blank'); }}>
                    ▶
                  </button>
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
                    {item.audioUrl && (
                      <button className={styles.audioAct} onClick={() => window.open(item.audioUrl, '_blank')}>
                        ⬇ {t('downloadFile')}
                      </button>
                    )}
                    <button className={styles.audioAct} onClick={() => success('已收藏到收藏夹')}>⭐</button>
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
