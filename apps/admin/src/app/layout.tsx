import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI工具站 - 管理后台',
  description: 'AI在线生成工具站管理后台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
