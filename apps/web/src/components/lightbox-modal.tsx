'use client';
import { useEffect } from 'react';

interface LightboxModalProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function LightboxModal({ src, alt, onClose }: LightboxModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { transform: scale(0.92) } to { transform: scale(1) } }
        @keyframes slideUp { from { transform: translateY(20px); opacity:0 } to { transform: translateY(0); opacity:1 } }
        .lightbox-img { max-width: 90vw; max-height: 85vh; object-fit: contain; border-radius: 12px; box-shadow: 0 32px 80px rgba(0,0,0,0.7); animation: scaleIn 0.25s ease; cursor: zoom-out; }
        .lightbox-close { position: fixed; top: 20px; right: 20px; width: 40px; height: 40px; background: rgba(255,255,255,0.1); border: none; border-radius: 50%; color: #fff; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; z-index: 1; }
        .lightbox-close:hover { background: rgba(255,255,255,0.2); }
        .lightbox-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 16px 24px; text-align: center; color: rgba(255,255,255,0.5); font-size: 13px; animation: slideUp 0.3s ease 0.1s both; }
      `}</style>
      <button className="lightbox-close" onClick={onClose}>✕</button>
      <img
        className="lightbox-img"
        src={src}
        alt={alt || ''}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="lightbox-footer">点击任意区域或按 ESC 关闭</div>
    </div>
  );
}
