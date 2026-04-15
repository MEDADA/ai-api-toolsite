'use client';

import React, { useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

interface ReferenceImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  strength: number;
  onStrengthChange: (v: number) => void;
}

export function ReferenceImageUpload({ value, onChange, strength, onStrengthChange }: ReferenceImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const { error } = useToast();

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const token = await apiClient.oss.getUploadToken('UPLOAD');
      // Upload to OSS using STS token
      const formData = new FormData();
      formData.append('key', `${token.upload_dir}/${Date.now()}_${file.name}`);
      formData.append('OSSAccessKeyId', token.AccessKeyId);
      formData.append('security-token', token.SecurityToken);
      formData.append('signature', ''); // placeholder — actual signature handled by OSS SDK
      formData.append('file', file);

      const uploadRes = await fetch(`https://${token.bucket}.${token.endpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('上传失败');

      const url = `https://${token.bucket}.${token.endpoint}/${token.upload_dir}/${Date.now()}_${file.name}`;
      setPreview(url);
      onChange(url);
    } catch (e) {
      error('图片上传失败，请重试');
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      error('请上传图片文件');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      error('图片大小不能超过 10MB');
      return;
    }
    uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = (e as unknown as DragEvent).dataTransfer?.files?.[0];
    if (file) uploadFile(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {preview ? (
        <div style={{ position: 'relative', display: 'inline-block', maxWidth: 200 }}>
          <img
            src={preview}
            alt="参考图预览"
            style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }}
          />
          <button
            onClick={() => { setPreview(null); onChange(''); }}
            style={{
              position: 'absolute', top: -8, right: -8,
              background: '#ef4444', color: '#fff', border: 'none',
              borderRadius: '50%', width: 24, height: 24,
              cursor: 'pointer', fontSize: 12, lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{
            border: '2px dashed rgba(255,255,255,0.15)', borderRadius: 12,
            padding: 32, textAlign: 'center', cursor: 'pointer',
            color: '#64748b', fontSize: 14, transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#6366f1'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(99,102,241,0.05)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.15)'; (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
        >
          {uploading ? (
            <div>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
              <div>上传中...</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📷</div>
              <div>点击上传参考图 / 拖拽图片到此处</div>
              <div style={{ marginTop: 4, fontSize: 12, color: '#475569' }}>支持 JPG/PNG，最大 10MB</div>
            </div>
          )}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Strength Slider */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>
          <span>图生图强度</span>
          <span style={{ color: '#6366f1', fontWeight: 600 }}>{strength.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={strength}
          onChange={(e) => onStrengthChange(parseFloat((e.target as HTMLInputElement).value))}
          style={{ width: '100%', accentColor: '#6366f1' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: 12, marginTop: 4 }}>
          <span>忠于原图</span>
          <span>自由发挥</span>
        </div>
      </div>
    </div>
  );
}
