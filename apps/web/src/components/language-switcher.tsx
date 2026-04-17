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
    // localePrefix: 'as-needed' means zh has no URL prefix, en shows '/en'
    const segments = pathname.split('/').filter(Boolean); // ['zh', 'image'] or ['image']
    const isFirstSegmentLocale = routing.locales.includes(segments[0] as 'zh' | 'en');
    let newPath: string;
    if (isFirstSegmentLocale) {
      // Replace existing locale in URL
      segments[0] = otherLocale;
      newPath = '/' + segments.join('/');
    } else {
      // No locale prefix yet (default zh), prepend 'en' for English
      newPath = otherLocale === 'en' ? `/${otherLocale}${pathname}` : pathname;
    }
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
