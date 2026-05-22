'use client';

import { useState, useEffect } from 'react';
import { NextIntlClientProvider } from 'next-intl';

// 静态导入所有 24 种语言 — 保证 standalone 模式正确 tracing
import zh from '@/messages/zh.json';
import en from '@/messages/en.json';
import hi from '@/messages/hi.json';
import es from '@/messages/es.json';
import ar from '@/messages/ar.json';
import fr from '@/messages/fr.json';
import pt from '@/messages/pt.json';
import ru from '@/messages/ru.json';
import ja from '@/messages/ja.json';
import de from '@/messages/de.json';
import id from '@/messages/id.json';
import ur from '@/messages/ur.json';
import bn from '@/messages/bn.json';
import vi from '@/messages/vi.json';
import tr from '@/messages/tr.json';
import th from '@/messages/th.json';
import ko from '@/messages/ko.json';
import it from '@/messages/it.json';
import fa from '@/messages/fa.json';
import tl from '@/messages/tl.json';
import my from '@/messages/my.json';
import am from '@/messages/am.json';
import he from '@/messages/he.json';
import mn from '@/messages/mn.json';

const messagesMap: Record<string, any> = {
  zh, en, hi, es, ar, fr, pt, ru, ja, de, id, ur, bn, vi,
  tr, th, ko, it, fa, tl, my, am, he, mn,
};

const DEFAULT_LOCALE = 'zh';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

/**
 * 客户端 Intl Provider 包装器
 *
 * 从 NEXT_LOCALE cookie 读取当前语言，动态提供对应翻译消息。
 * 使用 'use client' 隔离 next-intl，避免 SSR 时触发服务端配置查找。
 */
export function IntlClientProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const cookieLocale = getCookie('NEXT_LOCALE');
    const resolved = cookieLocale && messagesMap[cookieLocale]
      ? cookieLocale
      : DEFAULT_LOCALE;
    setLocale(resolved);
    document.documentElement.lang = resolved;
    setMounted(true);
  }, []);

  // SSR 阶段用默认语言，避免水合不一致
  const messages = mounted
    ? messagesMap[locale] || messagesMap[DEFAULT_LOCALE]
    : messagesMap[DEFAULT_LOCALE];

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
