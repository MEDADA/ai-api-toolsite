'use client';

import React, { useState } from 'react';

interface GalleryImage {
  id?: string;
  url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
}

interface ResultGalleryProps {
  images: GalleryImage[];
  onFavorite?: (url: string) => void;
}

export function ResultGallery({ images, onFavorite }: ResultGalleryProps) {
  const [selected, setSelected] = useState<GalleryImage | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12,
          marginTop: 20,
        }}
      >
        {images.map((img, i) => (
          <div
            key={i}
            onClick={() => setSelected(img)}
            style={{
              borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.06)',
              transition: 'transform 0.2s',
              position: 'relative',
            }}
          >
            <img
              src={img.thumbnail_url ?? img.url}
              alt={`图 ${i + 1}`}
              style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
              loading="lazy"
            />
            <div
              style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              className="gallery-hover"
            >
              <span style={{ color: '#fff', fontSize: 24, opacity: 0 }}>🔍</span>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: 20,
          }}
        >
          <img
            src={selected.url}
            alt="大图预览"
            style={{
              maxWidth: '90vw', maxHeight: '80vh', borderRadius: 12,
              objectFit: 'contain', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          />
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <a
              href={selected.url}
              download
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '10px 24px', borderRadius: 10, background: '#6366f1',
                color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600,
              }}
            >
              ⬇️ 下载原图
            </a>
            <button
              onClick={(e) => { e.stopPropagation(); onFavorite?.(selected.url); }}
              style={{
                padding: '10px 24px', borderRadius: 10,
                background: 'rgba(255,255,255,0.1)', color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,0.2)', fontSize: 14,
                cursor: 'pointer',
              }}
            >
              ⭐ 收藏
            </button>
            <button
              onClick={() => setSelected(null)}
              style={{
                padding: '10px 20px', borderRadius: 10,
                background: 'rgba(255,255,255,0.08)', color: '#64748b',
                border: 'none', fontSize: 14, cursor: 'pointer',
              }}
            >
              ✕ 关闭
            </button>
          </div>
        </div>
      )}

      <style>{`
        .gallery-hover:hover { background: rgba(0,0,0,0.3) !important; }
        .gallery-hover:hover span { opacity: 1 !important; }
      `}</style>
    </>
  );
}
