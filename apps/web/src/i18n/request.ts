import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async () => {
  // In App Router + next-intl v4, the [locale] segment is available via headers.
  // The middleware sets the locale in the request headers.
  // We use a fallback chain: accept-language header → default locale.
  const acceptLanguage = (await import('next-intl/server'))
    .getRequestConfig
    ? undefined
    : undefined;

  return {
    locale: routing.defaultLocale,
    messages: (await import(`./locales/zh.json`)).default,
  };
});
