import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI 工具站 — 图片·视频·语音一站式生成',
  description: '无需 API Key，选择模型 → 输入需求 → 点生成 → 下载结果，按次收费。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
