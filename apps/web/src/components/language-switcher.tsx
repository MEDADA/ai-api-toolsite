'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { routing } from '@/i18n/routing';

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations('nav');
  const router = useRouter();
  const pathname = usePathname();

  const otherLocale = locale === 'zh' ? 'en' : 'zh';
  const otherLabel = locale === 'zh' ? 'EN' : '中文';

  const handleSwitch = () => {
    // Replace the current locale prefix with the other locale
    const segments = pathname.split('/');
    segments[1] = otherLocale;
    const newPath = segments.join('/');
    router.push(newPath);
  };

  return (
    <button
      onClick={handleSwitch}
      style={{
        padding: '6px 14px', borderRadius: 8,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#94a3b8', fontSize: 13, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
        transition: 'all 0.2s',
      }}
    >
      🌐 {otherLabel}
    </button>
  );
}
