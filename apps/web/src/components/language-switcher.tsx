'use client';

import { usePathname, useRouter } from 'next/navigation';
import { routing } from '@/i18n/routing';

function getLocaleFromPathname(pathname: string): 'zh' | 'en' {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && routing.locales.includes(segments[0] as 'zh' | 'en')) {
    return segments[0] as 'zh' | 'en';
  }
  return 'zh'; // default
}

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = getLocaleFromPathname(pathname);
  const otherLocale = currentLocale === 'zh' ? 'en' : 'zh';
  const otherLabel = currentLocale === 'zh' ? 'EN' : '中文';

  const handleSwitch = () => {
    const segments = pathname.split('/').filter(Boolean);
    const isFirstSegmentLocale = routing.locales.includes(segments[0] as 'zh' | 'en');
    let newPath: string;
    if (isFirstSegmentLocale) {
      segments[0] = otherLocale;
      newPath = '/' + segments.join('/');
    } else {
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
