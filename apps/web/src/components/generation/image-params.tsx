'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

const SIZES = [
  { label: '512²', width: '512', height: '512' },
  { label: '768²', width: '768', height: '768' },
  { label: '1024²', width: '1024', height: '1024' },
  { label: '9:16', width: '1080', height: '1920' },
];

const QUALITY_OPTIONS = [
  { value: 'fast', labelKey: 'params.fast', steps: 20 },
  { value: 'standard', labelKey: 'params.standard', steps: 30 },
  { value: 'high', labelKey: 'params.highQuality', steps: 50 },
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

  const btnStyle = (selected: boolean) => ({
    padding: '5px 12px',
    borderRadius: 6,
    border: `1.5px solid ${selected ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
    background: selected ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
    color: selected ? '#a5b4fc' : '#64748b',
    fontSize: 12,
    fontWeight: selected ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
  });

  const labelStyle: React.CSSProperties = {
    color: '#475569',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginRight: 4,
  };

  const groupStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  };

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 12,
      padding: '10px 14px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 10,
    }}>
      {/* Size */}
      <div style={groupStyle}>
        <span style={labelStyle}>{t('params.size')}</span>
        {SIZES.map((s) => {
          const selected = s.width === width && s.height === height;
          return (
            <button key={s.label} onClick={() => { onWidthChange(s.width); onHeightChange(s.height); }} style={btnStyle(selected)}>
              {s.label}
            </button>
          );
        })}
      </div>

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

      {/* Quality */}
      <div style={groupStyle}>
        <span style={labelStyle}>{t('params.quality')}</span>
        {QUALITY_OPTIONS.map((q) => {
          const selected = q.value === steps;
          return (
            <button key={q.value} onClick={() => onStepsChange(q.value)} style={btnStyle(selected)}>
              {t(q.labelKey)}
            </button>
          );
        })}
      </div>

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

      {/* Count */}
      <div style={groupStyle}>
        <span style={labelStyle}>{t('params.count')}</span>
        {COUNT_OPTIONS.map((n) => {
          const selected = n === imageCount;
          return (
            <button key={n} onClick={() => onImageCountChange(n)} style={btnStyle(selected)}>
              {n}张
            </button>
          );
        })}
      </div>
    </div>
  );
}
