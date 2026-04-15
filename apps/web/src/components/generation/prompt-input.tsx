'use client';

import React from 'react';

interface PromptInputProps {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  placeholder?: string;
  rows?: number;
}

export function PromptInput({
  value,
  onChange,
  maxLength = 2000,
  placeholder = '描述你想要生成的图片，例如：一只橘色的猫在草地上奔跑，超写实风格，光影柔和',
  rows = 4,
}: PromptInputProps) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange((e.target as HTMLTextAreaElement).value.slice(0, maxLength))}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: '100%', padding: 14, borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.04)', color: '#e2e8f0',
          fontSize: 15, resize: 'vertical', minHeight: rows * 28,
          outline: 'none', lineHeight: 1.6, boxSizing: 'border-box',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = '#6366f1'; }}
        onBlur={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
      />
      <div
        style={{
          textAlign: 'right', marginTop: 6, fontSize: 12,
          color: value.length > maxLength * 0.9 ? '#f59e0b' : '#64748b',
        }}
      >
        {value.length}/{maxLength}
      </div>
    </div>
  );
}
