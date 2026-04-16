'use client';

import React, { useCallback, useRef, useState } from 'react';
import { SiteHeader } from '@/components/site-header';
import { LoginModal } from '@/components/login-modal';
import { GenerationStatus } from '@/components/generation/generation-status';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { useTranslations } from 'next-intl';

const TABS_KEY = ['tts', 'asr', 'clone'] as const;
type TabKey = typeof TABS_KEY[number];

const VOICES = [
  { value: 'female_young', label: '🎀 甜美女声' },
  { value: 'female_mature', label: '👩 成熟女声' },
  { value: 'male_young', label: '🎧 清新男声' },
  { value: 'male_mature', label: '🎤 磁性男声' },
  { value: 'child', label: '🧒 童声' },
  { value: 'female_broadcast', label: '📢 播音女声' },
  { value: 'male_broadcast', label: '🎙️ 播音男声' },
  { value: 'female_story', label: '📖 故事女声' },
  { value: 'male_story', label: '📚 故事男声' },
  { value: 'female_cartoon', label: '🧚 卡通女声' },
];

export default function AudioPage() {
  const { isLoggedIn } = useAuth();
  const { error, success } = useToast();
  const t = useTranslations('audio');
  const tToast = useTranslations('toast');
  const [showLogin, setShowLogin] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('tts');

  // TTS state
  const [ttsText, setTtsText] = useState('');
  const [ttsVoice, setTtsVoice] = useState('female_young');
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsVolume, setTtsVolume] = useState(80);
  const [ttsGenerating, setTtsGenerating] = useState(false);
  const [ttsTaskId, setTtsTaskId] = useState<string | null>(null);
  const [ttsResult, setTtsResult] = useState<string | null>(null);

  // ASR state
  const [asrUploading, setAsrUploading] = useState(false);
  const [asrResult, setAsrResult] = useState<string | null>(null);
  const [asrTaskId, setAsrTaskId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Clone state
  const [cloneAudioUrl, setCloneAudioUrl] = useState('');
  const [cloneText, setCloneText] = useState('');
  const [cloneDuration, setCloneDuration] = useState<number | null>(null);
  const [cloneGenerating, setCloneGenerating] = useState(false);
  const [cloneTaskId, setCloneTaskId] = useState<string | null>(null);
  const [cloneResult, setCloneResult] = useState<string | null>(null);
  const cloneFileRef = useRef<HTMLInputElement>(null);

  const ttsEstimate = (ttsText.length / 1000) * 0.3;

  const handleTTSGenerate = useCallback(async () => {
    if (!isLoggedIn) { setShowLogin(true); return; }
    if (!ttsText.trim()) { error(tToast('needText')); return; }
    setTtsGenerating(true);
    setTtsResult(null);
    try {
      const res = await apiClient.tasks.create({
        model_slug: 'cosyvoice-v3',
        task_type: 'TTS',
        text: ttsText,
        voice: ttsVoice,
        speed: ttsSpeed,
        volume: ttsVolume,
      } as Parameters<typeof apiClient.tasks.create>[0]);
      setTtsTaskId(res.task_id);
    } catch (e) {
      error((e as Error).message || tToast('taskFailed'));
      setTtsGenerating(false);
    }
  }, [isLoggedIn, ttsText, ttsVoice, ttsSpeed, ttsVolume, error, tToast]);

  const handleASRUpload = async (file: File) => {
    if (!isLoggedIn) { setShowLogin(true); return; }
    if (file.size > 50 * 1024 * 1024) { error(tToast('fileTooLarge')); return; }
    setAsrUploading(true);
    setAsrResult(null);
    try {
      const token = await apiClient.oss.getUploadToken('UPLOAD');
      const formData = new FormData();
      formData.append('key', `${token.upload_dir}/${Date.now()}_${file.name}`);
      formData.append('OSSAccessKeyId', token.AccessKeyId);
      formData.append('security-token', token.SecurityToken);
      formData.append('file', file);
      await fetch(`https://${token.bucket}.${token.endpoint}`, { method: 'POST', body: formData });
      const audioUrl = `https://${token.bucket}.${token.endpoint}/${token.upload_dir}/${Date.now()}_${file.name}`;

      const res = await apiClient.tasks.create({
        model_slug: 'asr-whisper',
        task_type: 'ASR',
        audio_url: audioUrl,
      } as Parameters<typeof apiClient.tasks.create>[0]);
      setAsrTaskId(res.task_id);
      setAsrResult(t('transcribing'));
    } catch (e) {
      error(tToast('uploadFailed'));
    } finally {
      setAsrUploading(false);
    }
  };

  const handleCloneUpload = async (file: File) => {
    const url = URL.createObjectURL(file);
    const audio = new (window.Audio as typeof Audio)(url);
    await new Promise<void>((resolve) => {
      audio.addEventListener('loadedmetadata', () => {
        const dur = audio.duration;
        setCloneDuration(dur);
        if (dur < 10 || dur > 60) {
          error(tToast('audioDurationError'));
          URL.revokeObjectURL(url);
          resolve();
          return;
        }
        resolve();
      });
      audio.addEventListener('error', () => {
        error(tToast('uploadFailed'));
        resolve();
      });
    });
    setCloneAudioUrl(url);
  };

  const handleCloneGenerate = useCallback(async () => {
    if (!isLoggedIn) { setShowLogin(true); return; }
    if (!cloneAudioUrl || !cloneText.trim()) { error(tToast('uploadRefText')); return; }
    setCloneGenerating(true);
    setCloneResult(null);
    try {
      const res = await apiClient.tasks.create({
        model_slug: 'voice-clone',
        task_type: 'VOICE_CLONE',
        source_audio_url: cloneAudioUrl,
        target_text: cloneText,
      } as Parameters<typeof apiClient.tasks.create>[0]);
      setCloneTaskId(res.task_id);
    } catch (e) {
      error((e as Error).message || tToast('taskFailed'));
      setCloneGenerating(false);
    }
  }, [isLoggedIn, cloneAudioUrl, cloneText, error, tToast]);

  return (
    <main style={{ minHeight: '100vh', background: '#0f0f23' }}>
      <SiteHeader />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
        <h1 style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>🎙️ {t('title')}</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>{t('subtitle')}</p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {TABS_KEY.map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: '10px 20px', borderBottom: '2px solid transparent',
                background: 'transparent', color: activeTab === key ? '#a5b4fc' : '#64748b',
                fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                borderLeft: 'none', borderRight: 'none', borderTop: 'none',
                borderColor: activeTab === key ? '#6366f1' : 'transparent',
              }}
            >
              {t(`tab.${key}`)}
            </button>
          ))}
        </div>

        {/* ── TTS ── */}
        {activeTab === 'tts' && (
          <>
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>{t('voiceLabel')}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                {VOICES.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => setTtsVoice(v.value)}
                    style={{
                      padding: '12px 8px', borderRadius: 10, textAlign: 'center',
                      border: `2px solid ${ttsVoice === v.value ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                      background: ttsVoice === v.value ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                      color: ttsVoice === v.value ? '#a5b4fc' : '#64748b', fontSize: 13,
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </section>

            <section style={{ marginBottom: 24 }}>
              <h2 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>{t('textLabel')}</h2>
              <textarea
                value={ttsText}
                onChange={(e) => setTtsText((e.target as HTMLTextAreaElement).value.slice(0, 5000))}
                placeholder={t('textPlaceholder')}
                rows={5}
                style={{
                  width: '100%', padding: 14, borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)', color: '#e2e8f0',
                  fontSize: 15, resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <div style={{ textAlign: 'right', marginTop: 6, fontSize: 12, color: '#64748b' }}>
                {t('textLen', { count: ttsText.length })}
              </div>
            </section>

            <section style={{ marginBottom: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>
                    {t('speed')} {ttsSpeed.toFixed(1)}x
                  </label>
                  <input type="range" min={0.5} max={2.0} step={0.1} value={ttsSpeed}
                    onChange={(e) => setTtsSpeed(parseFloat((e.target as HTMLInputElement).value))}
                    style={{ width: '100%', accentColor: '#6366f1' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569', marginTop: 4 }}>
                    <span>{t('slow')}</span><span>{t('fast')}</span>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>
                    {t('volume')} {ttsVolume}%
                  </label>
                  <input type="range" min={0} max={100} value={ttsVolume}
                    onChange={(e) => setTtsVolume(parseInt((e.target as HTMLInputElement).value))}
                    style={{ width: '100%', accentColor: '#6366f1' }} />
                </div>
              </div>
            </section>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ color: '#94a3b8', fontSize: 14 }}>
                {t('estimate')}：<strong style={{ color: '#e2e8f0' }}>¥{ttsEstimate.toFixed(2)}</strong>
              </div>
              {!isLoggedIn ? (
                <button onClick={() => setShowLogin(true)} style={{ padding: '10px 20px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', fontSize: 14, cursor: 'pointer' }}>
                  {t('loginToGenerate')}
                </button>
              ) : (
                <button onClick={handleTTSGenerate} disabled={!ttsText.trim() || ttsGenerating}
                  style={{ padding: '10px 24px', borderRadius: 8, background: !ttsText.trim() || ttsGenerating ? 'rgba(99,102,241,0.4)' : '#6366f1', color: '#fff', border: 'none', fontSize: 14, cursor: !ttsText.trim() || ttsGenerating ? 'not-allowed' : 'pointer' }}>
                  {ttsGenerating ? `⚡ ${t('generating')}` : `🚀 ${t('generating')}（¥${ttsEstimate.toFixed(2)}）`}
                </button>
              )}
            </div>

            {ttsTaskId && (
              <GenerationStatus
                taskId={ttsTaskId}
                onComplete={(outputs) => {
                  if (outputs[0]) setTtsResult(outputs[0].url);
                  setTtsGenerating(false);
                  success(tToast('successAudio'));
                }}
                onError={(err) => { error(err); setTtsGenerating(false); }}
              />
            )}

            {ttsResult && (
              <div style={{ marginTop: 20 }}>
                <audio src={ttsResult} controls style={{ width: '100%', maxWidth: 500 }} />
                <a href={ttsResult} download style={{ display: 'inline-block', marginTop: 10, padding: '8px 16px', borderRadius: 8, background: '#6366f1', color: '#fff', textDecoration: 'none', fontSize: 13 }}>
                  ⬇️ {t('download')}
                </a>
              </div>
            )}
          </>
        )}

        {/* ── ASR ── */}
        {activeTab === 'asr' && (
          <>
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>{t('uploadAudio')}</h2>
              <div
                onClick={() => fileRef.current?.click()}
                onDrop={(e) => { e.preventDefault(); const f = (e as unknown as DragEvent).dataTransfer?.files?.[0]; if (f) handleASRUpload(f); }}
                onDragOver={(e) => e.preventDefault()}
                style={{
                  border: '2px dashed rgba(255,255,255,0.15)', borderRadius: 12,
                  padding: 48, textAlign: 'center', cursor: 'pointer',
                  color: '#64748b', fontSize: 14, transition: 'all 0.2s',
                }}
              >
                {asrUploading ? (
                  <div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                    <div>{t('uploading')}</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🎵</div>
                    <div>{t('dragOrClick')}</div>
                    <div style={{ marginTop: 4, color: '#475569', fontSize: 12 }}>{t('audioHint')}</div>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="audio/*" style={{ display: 'none' }}
                onChange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleASRUpload(f); }} />
            </section>

            {asrTaskId && (
              <GenerationStatus
                taskId={asrTaskId}
                onComplete={(outputs) => {
                  setAsrResult(outputs[0]?.url ?? 'Transcribe complete');
                  setTtsGenerating(false);
                  success(tToast('successTranscribe'));
                }}
                onError={(err) => { error(err); }}
              />
            )}

            {asrResult && (
              <div style={{ marginTop: 20 }}>
                <h3 style={{ color: '#e2e8f0', fontSize: 14, marginBottom: 10, fontWeight: 600 }}>{t('transcribeResult')}</h3>
                <div style={{ padding: 16, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: 14, lineHeight: 1.8 }}>
                  {asrResult}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Clone ── */}
        {activeTab === 'clone' && (
          <>
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
                {t('refAudio')}
                {cloneDuration && (
                  <span style={{ color: cloneDuration >= 10 && cloneDuration <= 60 ? '#22c55e' : '#ef4444', fontSize: 13, marginLeft: 12 }}>
                    {t('durationValid', { seconds: cloneDuration.toFixed(1), ok: cloneDuration >= 10 && cloneDuration <= 60 ? '✅' : t('durationInvalid') })}
                  </span>
                )}
              </h2>
              <div
                onClick={() => cloneFileRef.current?.click()}
                onDrop={(e) => { e.preventDefault(); const f = (e as unknown as DragEvent).dataTransfer?.files?.[0]; if (f) handleCloneUpload(f); }}
                onDragOver={(e) => e.preventDefault()}
                style={{
                  border: '2px dashed rgba(255,255,255,0.15)', borderRadius: 12,
                  padding: 40, textAlign: 'center', cursor: 'pointer',
                  color: '#64748b', fontSize: 14, transition: 'all 0.2s',
                }}
              >
                {cloneAudioUrl ? (
                  <div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🎵</div>
                    <audio src={cloneAudioUrl} controls style={{ maxWidth: 300 }} />
                    <div style={{ marginTop: 8 }}>{t('dragOrClick')}（{t('refHint')}）</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🎤</div>
                    <div>{t('dragOrClick')}</div>
                    <div style={{ marginTop: 4, color: '#475569', fontSize: 12 }}>{t('refHint')} · ¥2.0/次</div>
                  </div>
                )}
              </div>
              <input ref={cloneFileRef} type="file" accept="audio/*" style={{ display: 'none' }}
                onChange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleCloneUpload(f); }} />
            </section>

            <section style={{ marginBottom: 24 }}>
              <h2 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>{t('cloneTextLabel')}</h2>
              <textarea
                value={cloneText}
                onChange={(e) => setCloneText((e.target as HTMLTextAreaElement).value.slice(0, 500))}
                placeholder={t('cloneTextPlaceholder')}
                rows={4}
                style={{
                  width: '100%', padding: 14, borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)', color: '#e2e8f0',
                  fontSize: 15, resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </section>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ color: '#94a3b8', fontSize: 14 }}>
                {t('estimate')}：<strong style={{ color: '#e2e8f0' }}>¥2.00</strong>
              </div>
              {!isLoggedIn ? (
                <button onClick={() => setShowLogin(true)} style={{ padding: '10px 20px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  {t('loginToGenerate')}
                </button>
              ) : (
                <button onClick={handleCloneGenerate} disabled={!cloneAudioUrl || !cloneText.trim() || cloneGenerating}
                  style={{ padding: '10px 24px', borderRadius: 8, background: !cloneAudioUrl || !cloneText.trim() || cloneGenerating ? 'rgba(99,102,241,0.4)' : '#6366f1', color: '#fff', border: 'none', cursor: !cloneAudioUrl || !cloneText.trim() || cloneGenerating ? 'not-allowed' : 'pointer' }}>
                  {cloneGenerating ? `⚡ ${t('generating')}` : `🚀 ${t('generating')}（¥2.00）`}
                </button>
              )}
            </div>

            {cloneTaskId && (
              <GenerationStatus
                taskId={cloneTaskId}
                onComplete={(outputs) => {
                  if (outputs[0]) setCloneResult(outputs[0].url);
                  setCloneGenerating(false);
                  success(tToast('successClone'));
                }}
                onError={(err) => { error(err); setCloneGenerating(false); }}
              />
            )}

            {cloneResult && (
              <div style={{ marginTop: 20 }}>
                <audio src={cloneResult} controls style={{ width: '100%', maxWidth: 500 }} />
                <a href={cloneResult} download style={{ display: 'inline-block', marginTop: 10, padding: '8px 16px', borderRadius: 8, background: '#6366f1', color: '#fff', textDecoration: 'none', fontSize: 13 }}>
                  ⬇️ {t('downloadFile')}
                </a>
              </div>
            )}
          </>
        )}
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </main>
  );
}
