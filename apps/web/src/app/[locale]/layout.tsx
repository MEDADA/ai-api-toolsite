import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

const titles = {
  zh: 'AI 工具站 — 图片·视频·语音一站式生成',
  en: 'AI Toolsite — Image · Video · Audio Generation',
};
const descriptions = {
  zh: '无需 API Key，选择模型 → 输入需求 → 点生成 → 下载结果，按次收费。',
  en: 'No API Key needed. Select a model → describe your request → generate → download. Pay per use.',
};

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: titles[locale as 'zh' | 'en'] ?? titles.zh,
    description: descriptions[locale as 'zh' | 'en'] ?? descriptions.zh,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // In Next.js 14 App Router, params is a Promise - must await!
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'zh' | 'en')) {
    notFound();
  }

  // Direct import to bypass broken requestLocale in next-intl v4 App Router
  const messages = (await import(`@/i18n/locales/${locale}.json`)).default;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
