'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useTranslations } from 'next-intl';

interface Model {
  id: string;
  slug: string;
  name: string;
  type: string;
  description?: string;
  capability: {
    supports_image2image?: boolean;
    supports_styles?: string[];
    supported_sizes?: string[];
  };
  pricing: {
    unit_price: number;
    unit: string;
    level_discounts: Record<string, number>;
  };
}

interface ModelSelectorProps {
  type: 'image' | 'video' | 'audio';
  value: string;
  onChange: (slug: string) => void;
}

const TAB_OPTIONS = ['text2img', 'img2img'] as const;

export function ModelSelector({ type, value, onChange }: ModelSelectorProps) {
  const tm = useTranslations('modelSelector');
  const [tab, setTab] = useState<'text2img' | 'img2img'>('text2img');
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadModels = async () => {
      setLoading(true);
      try {
        const res = await apiClient.models.list(type);
        setModels(res.models as unknown as Model[]);
      } catch {
        // Fallback to empty
      } finally {
        setLoading(false);
      }
    };
    loadModels();
  }, [type]);

  const filtered = models.filter((m) => {
    if (tab === 'text2img') return !m.capability.supports_image2image;
    return m.capability.supports_image2image;
  });

  return (
    <div>
      {/* Tab switcher for image type */}
      {type === 'image' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {TAB_OPTIONS.map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              style={{
                padding: '6px 16px', borderRadius: 20, border: '1px solid',
                borderColor: tab === tabKey ? '#6366f1' : 'rgba(255,255,255,0.15)',
                background: tab === tabKey ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: tab === tabKey ? '#a5b4fc' : '#64748b', fontSize: 14,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {tabKey === 'text2img' ? tm('text2img') : tm('img2img')}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ color: '#64748b', fontSize: 14 }}>{tm('loading')}</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: '#64748b', fontSize: 14 }}>{tm('noModels')}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {filtered.map((m) => (
            <button
              key={m.slug}
              onClick={() => onChange(m.slug)}
              style={{
                padding: 16, borderRadius: 12,
                border: `2px solid ${value === m.slug ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                background: value === m.slug ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                {m.name}
              </div>
              <div style={{ color: '#6366f1', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                ¥{(m.pricing.unit_price / 100).toFixed(2)}/{m.pricing.unit}
              </div>
              {m.description && (
                <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.4 }}>
                  {m.description}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
