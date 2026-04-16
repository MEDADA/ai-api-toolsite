'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

const SIZES = [
  { label: '512×512', width: '512', height: '512' },
  { label: '768×768', width: '768', height: '768' },
  { label: '1024×1024', width: '1024', height: '1024' },
  { label: '1080×1920', width: '1080', height: '1920' },
];

const QUALITY_OPTIONS = [
  { value: 'fast', labelKey: 'params.fast', steps: 20, badgeKey: null },
  { value: 'standard', labelKey: 'params.standard', steps: 30, badgeKey: null },
  { value: 'high', labelKey: 'params.highQuality', steps: 50, badgeKey: 'params.recommended' },
];

const COUNT_OPTIONS = [1, 2, 4];

interface ImageParamsProps {
  width: string;
  height: string;
  steps: string;
  imageCount: number;
  onWidthChange: (v: string) => void;
  onHeightChange: (v: string) => void;
  onStepsChange: (v: string) => void;
  onImageCountChange: (v: number) => void;
}

export function ImageParams({
  width, height, steps, imageCount,
  onWidthChange, onHeightChange, onStepsChange, onImageCountChange,
}: ImageParamsProps) {
  const t = useTranslations();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Size Grid */}
      <div>
        <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 10, fontWeight: 600 }}>
          {t('params.size')}
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {SIZES.map((s) => {
            const isSelected = s.width === width && s.height === height;
            return (
              <button
                key={s.label}
                onClick={() => { onWidthChange(s.width); onHeightChange(s.height); }}
                style={{
                  padding: '10px 4px', borderRadius: 8, textAlign: 'center',
                  border: `2px solid ${isSelected ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                  background: isSelected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                  color: isSelected ? '#a5b4fc' : '#64748b', fontSize: 13,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quality */}
      <div>
        <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 10, fontWeight: 600 }}>
          {t('params.quality')}
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          {QUALITY_OPTIONS.map((q) => {
            const isSelected = q.value === steps;
            return (
              <button
                key={q.value}
                onClick={() => onStepsChange(q.value)}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 8, textAlign: 'center',
                  border: `2px solid ${isSelected ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                  background: isSelected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                  color: isSelected ? '#a5b4fc' : '#64748b', fontSize: 13,
                  cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
                }}
              >
                {t(q.labelKey)}
                {q.badgeKey && (
                  <span style={{
                    position: 'absolute', top: -8, right: -8,
                    background: '#f59e0b', color: '#000', fontSize: 10,
                    padding: '2px 6px', borderRadius: 10, fontWeight: 700,
                  }}>
                    {t(q.badgeKey)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Count */}
      <div>
        <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 10, fontWeight: 600 }}>
          {t('params.count')}
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          {COUNT_OPTIONS.map((n) => {
            const isSelected = n === imageCount;
            return (
              <button
                key={n}
                onClick={() => onImageCountChange(n)}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 8, textAlign: 'center',
                  border: `2px solid ${isSelected ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                  background: isSelected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                  color: isSelected ? '#a5b4fc' : '#64748b', fontSize: 14,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {n}张
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
