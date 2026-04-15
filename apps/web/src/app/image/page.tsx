'use client';

import React, { useCallback, useState } from 'react';
import { SiteHeader } from '@/components/site-header';
import { ModelSelector } from '@/components/generation/model-selector';
import { PromptInput } from '@/components/generation/prompt-input';
import { ImageParams } from '@/components/generation/image-params';
import { ReferenceImageUpload } from '@/components/generation/reference-image-upload';
import { GenerationStatus } from '@/components/generation/generation-status';
import { ResultGallery } from '@/components/generation/result-gallery';
import { GenerationButton } from '@/components/generation/generation-button';
import { LoginModal } from '@/components/login-modal';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';

interface ImageOutput {
  url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
}

export default function ImagePage() {
  const { isLoggedIn, balance } = useAuth();
  const { error, success } = useToast();
  const [showLogin, setShowLogin] = useState(false);

  const [selectedModel, setSelectedModel] = useState('flux-2-schnell');
  const [mode, setMode] = useState<'text2img' | 'img2img'>('text2img');
  const [prompt, setPrompt] = useState('');
  const [width, setWidth] = useState('1024');
  const [height, setHeight] = useState('1024');
  const [steps, setSteps] = useState('standard');
  const [imageCount, setImageCount] = useState(1);
  const [referenceUrl, setReferenceUrl] = useState('');
  const [strength, setStrength] = useState(0.7);

  const [generating, setGenerating] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [taskOutputs, setTaskOutputs] = useState<ImageOutput[]>([]);
  const [galleryOutputs, setGalleryOutputs] = useState<ImageOutput[]>([]);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);

  // Estimate: flux-2-schnell = 0.005元, standard=1x, high=2x
  const getPricePerImage = () => {
    const base = selectedModel.includes('schnell') ? 0.005 : 0.012;
    const multiplier = steps === 'fast' ? 0.7 : steps === 'high' ? 2.0 : 1.0;
    return base * multiplier;
  };
  const estimateCost = getPricePerImage() * imageCount;
  const balanceYuan = balance ? balance.available / 100 : null;

  const handleGenerate = useCallback(async () => {
    if (!isLoggedIn) { setShowLogin(true); return; }
    if (!prompt.trim()) { error('请输入图片描述'); return; }

    setGenerating(true);
    setProgressMsg(null);
    setTaskOutputs([]);
    setCurrentTaskId(null);

    try {
      const params = {
        model_slug: selectedModel,
        prompt,
        width,
        height,
        num_inference_steps: steps as 'fast' | 'standard' | 'high',
        image_count: imageCount,
        strength,
        ...(mode === 'img2img' && referenceUrl ? { reference_image_url: referenceUrl } : {}),
      };

      const res = await apiClient.tasks.create(params as Parameters<typeof apiClient.tasks.create>[0]);
      setCurrentTaskId(res.task_id);
      setProgressMsg('任务已创建，正在排队...');
    } catch (e) {
      error((e as Error).message || '创建任务失败');
      setGenerating(false);
    }
  }, [isLoggedIn, prompt, selectedModel, width, height, steps, imageCount, strength, referenceUrl, mode, error]);

  const handleStreamComplete = useCallback((outputs: ImageOutput[]) => {
    setTaskOutputs(outputs);
    setGalleryOutputs((prev) => [...outputs, ...prev]);
    setGenerating(false);
    success('🎉 图片生成完成！');
  }, [success]);

  const handleStreamError = useCallback((err: string) => {
    error(`生成失败: ${err}`);
    setGenerating(false);
  }, [error]);

  const handleFavorite = useCallback(async (taskId: string) => {
    try {
      await apiClient.favorites.add(taskId);
      success('已添加到收藏夹 ⭐');
    } catch {
      error('收藏失败');
    }
  }, [success, error]);

  return (
    <main style={{ minHeight: '100vh', background: '#0f0f23' }}>
      <SiteHeader />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
        <h1 style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
          🎨 图片生成
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 32 }}>
          文生图 / 图生图，多种风格模型可选
        </p>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {([
            { key: 'text2img', label: '🎨 文生图' },
            { key: 'img2img', label: '🖼️ 图生图' },
          ] as const).map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              style={{
                padding: '8px 20px', borderRadius: 20, border: '1px solid',
                borderColor: mode === m.key ? '#6366f1' : 'rgba(255,255,255,0.12)',
                background: mode === m.key ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: mode === m.key ? '#a5b4fc' : '#64748b', fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Model Selector */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>选择模型</h2>
          <ModelSelector
            type="image"
            value={selectedModel}
            onChange={setSelectedModel}
          />
        </section>

        {/* Prompt */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>图片描述</h2>
          <PromptInput
            value={prompt}
            onChange={setPrompt}
            maxLength={2000}
            rows={4}
          />
        </section>

        {/* Reference image (img2img only) */}
        {mode === 'img2img' && (
          <section style={{ marginBottom: 28 }}>
            <h2 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>参考图</h2>
            <ReferenceImageUpload
              value={referenceUrl}
              onChange={setReferenceUrl}
              strength={strength}
              onStrengthChange={setStrength}
            />
          </section>
        )}

        {/* Size / Quality / Count */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>参数设置</h2>
          <ImageParams
            width={width}
            height={height}
            steps={steps}
            imageCount={imageCount}
            onWidthChange={setWidth}
            onHeightChange={setHeight}
            onStepsChange={setSteps}
            onImageCountChange={setImageCount}
          />
        </section>

        {/* Generate button */}
        <div
          style={{
            padding: '16px 20px', borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
            marginBottom: 24,
          }}
        >
          <GenerationButton
            estimate={estimateCost}
            balance={balanceYuan}
            disabled={!prompt.trim()}
            loading={generating}
            label={generating ? '⚡ 生成中...' : `🚀 生成（¥${estimateCost.toFixed(2)}）`}
          />
          {!isLoggedIn && (
            <button
              onClick={() => setShowLogin(true)}
              style={{
                padding: '12px 20px', borderRadius: 10, background: '#6366f1',
                color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              登录后生成
            </button>
          )}
          {isLoggedIn && (
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
              {generating ? '⚡ 生成中...' : `🚀 开始生成（¥${estimateCost.toFixed(2)}）`}
            </button>
          )}
        </div>

        {/* Generation Status */}
        {currentTaskId && (
          <GenerationStatus
            taskId={currentTaskId}
            onComplete={handleStreamComplete}
            onError={handleStreamError}
            onFavorite={handleFavorite}
          />
        )}

        {/* Current task outputs */}
        {taskOutputs.length > 0 && (
          <section style={{ marginTop: 24 }}>
            <h2 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>本次结果</h2>
            <ResultGallery
              images={taskOutputs}
              onFavorite={(url) => {
                apiClient.favorites.add(currentTaskId!).then(() => success('已收藏 ⭐')).catch(() => error('收藏失败'));
              }}
            />
          </section>
        )}

        {/* Gallery */}
        {galleryOutputs.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <h2 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
              📸 历史生成 ({galleryOutputs.length})
            </h2>
            <ResultGallery images={galleryOutputs} />
          </section>
        )}
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </main>
  );
}
