export const routing = {
  locales: [
    'zh', 'en', 'hi', 'es', 'ar', 'fr', 'pt',
    'ru', 'ja', 'de', 'id', 'ur', 'bn', 'vi',
    'tr', 'th', 'ko', 'it', 'fa', 'tl', 'my',
    'am', 'he', 'mn',
  ] as const,
  defaultLocale: 'zh' as const,
  localePrefix: 'never' as const,
} as const;

export type Locale = (typeof routing.locales)[number];
