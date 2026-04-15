'use client';

import React, { useCallback, useState } from 'react';
import { SiteHeader } from '@/components/site-header';
import { ModelSelector } from '@/components/generation/model-selector';
import { PromptInput } from '@/components/generation/prompt-input';
import { GenerationStatus } from '@/components/generation/generation-status';
import { ResultGallery } from '@/components/generation/result-gallery';
import { LoginModal } from '@/components/login-modal';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';

const DURATIONS = [3, 5, 10, 15];
const RESOLUTIONS = ['540p', '720p', '1080p', '4K'];

export default function VideoPage() {
  const { isLoggedIn, balance } = useAuth();
  const { error, success } = useToast();
  const [showLogin, setShowLogin] = useState(false);

  const [selectedModel, setSelectedModel] = useState('seedance-2-0');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState('1080p');

  const [generating, setGenerating] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [currentOutputs, setCurrentOutputs] = useState<Array<{ url: string; thumbnail_url?: string; width?: number; height?: number }>>([]);
  const [historyOutputs, setHistoryOutputs] = useState<typeof currentOutputs>([]);

  // Price: seedance-2.0 = 3元/s, seedance-1.5 = 1.5元/s, kling-3.0 = 3元/s
  const getPricePerSec = () => {
    if (selectedModel.includes('1-5')) return 0.015;
    return 0.03;
  };
  const estimateCost = getPricePerSec() * duration;
  const balanceYuan = balance ? balance.available / 100 : null;

  const handleGenerate = useCallback(async () => {
    if (!isLoggedIn) { setShowLogin(true); return; }
    if (!prompt.trim()) { error('请输入视频描述'); return; }

    setGenerating(true);
    setCurrentOutputs([]);
    setCurrentTaskId(null);

    try {
      const res = await apiClient.tasks.create({
        model_slug: selectedModel,
        prompt,
        duration,
        resolution,
      } as Parameters<typeof apiClient.tasks.create>[0]);
      setCurrentTaskId(res.task_id);
    } catch (e) {
      error((e as Error).message || '创建任务失败');
      setGenerating(false);
    }
  }, [isLoggedIn, prompt, selectedModel, duration, resolution, error]);

  const handleComplete = useCallback((outputs: typeof currentOutputs) => {
    setCurrentOutputs(outputs);
    setHistoryOutputs((prev) => [...outputs, ...prev]);
    setGenerating(false);
    success('🎬 视频生成完成！');
  }, [success]);

  return (
    <main style={{ minHeight: '100vh', background: '#0f0f23' }}>
      <SiteHeader />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
        <h1 style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
          🎬 视频生成
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 32 }}>
          文字转视频，支持 3-15 秒时长，高清输出
        </p>

        {/* Model Selector */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>选择模型</h2>
          <ModelSelector type="video" value={selectedModel} onChange={setSelectedModel} />
        </section>

        {/* Prompt */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>视频描述</h2>
          <PromptInput
            value={prompt}
            onChange={setPrompt}
            maxLength={500}
            placeholder="描述你想要生成的视频场景，例如：日落海景，海浪拍打礁石，光影效果，电影级质感"
            rows={3}
          />
        </section>

        {/* Duration + Resolution */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>时长与画质</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Duration */}
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 10, fontWeight: 600 }}>
                时长
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    style={{
                      flex: 1, padding: '10px 4px', borderRadius: 8, textAlign: 'center',
                      border: `2px solid ${duration === d ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                      background: duration === d ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                      color: duration === d ? '#a5b4fc' : '#64748b', fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    {d}秒
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 10, fontWeight: 600 }}>
                分辨率
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution((e.target as HTMLSelectElement).value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)', color: '#e2e8f0',
                  fontSize: 14, outline: 'none',
                }}
              >
                {RESOLUTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Estimate bar */}
        <div
          style={{
            padding: '16px 20px', borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: 14 }}>
            预估费用：<strong style={{ color: '#e2e8f0' }}>¥{estimateCost.toFixed(2)}</strong>
            <span style={{ color: '#64748b', marginLeft: 8 }}>
              {duration}秒 × ¥{getPricePerSec() * 100}/百帧
            </span>
          </div>
          {balanceYuan !== null && (
            <span style={{ color: '#64748b', fontSize: 13, marginLeft: 'auto' }}>
              余额 ¥{balanceYuan.toFixed(2)}
            </span>
          )}
        </div>

        {/* Generate */}
        {!isLoggedIn ? (
          <button
            onClick={() => setShowLogin(true)}
            style={{
              padding: '12px 28px', borderRadius: 10, background: '#6366f1',
              color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            登录后生成
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || generating}
            style={{
              padding: '12px 28px', borderRadius: 10,
              background: !prompt.trim() || generating
                ? 'rgba(99,102,241,0.4)'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', border: 'none', fontSize: 15, fontWeight: 700,
              cursor: !prompt.trim() || generating ? 'not-allowed' : 'pointer',
              boxShadow: !prompt.trim() || generating ? 'none' : '0 4px 14px rgba(99,102,241,0.4)',
            }}
          >
            {generating ? '⚡ 生成中...' : `🚀 生成视频（¥${estimateCost.toFixed(2)}）`}
          </button>
        )}

        {/* Status */}
        {currentTaskId && (
          <GenerationStatus
            taskId={currentTaskId}
            onComplete={handleComplete}
            onError={(err) => { error(err); setGenerating(false); }}
          />
        )}

        {/* Video player */}
        {currentOutputs.map((o, i) => (
          <div key={i} style={{ marginTop: 24 }}>
            <video
              src={o.url}
              controls
              style={{ width: '100%', maxWidth: 720, borderRadius: 12, display: 'block' }}
            />
          </div>
        ))}

        {/* History */}
        {historyOutputs.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <h2 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
              🎞️ 历史视频 ({historyOutputs.length})
            </h2>
            <ResultGallery images={historyOutputs} />
          </section>
        )}
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </main>
  );
}
