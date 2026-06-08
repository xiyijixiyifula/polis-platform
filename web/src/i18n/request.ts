import { getRequestConfig } from 'next-intl/server';
import { routing, type Locale } from './routing';

import zh from '../messages/zh.json';
import en from '../messages/en.json';
import hi from '../messages/hi.json';
import es from '../messages/es.json';
import ar from '../messages/ar.json';
import fr from '../messages/fr.json';
import pt from '../messages/pt.json';
import ru from '../messages/ru.json';
import ja from '../messages/ja.json';
import de from '../messages/de.json';
import id from '../messages/id.json';
import ur from '../messages/ur.json';
import bn from '../messages/bn.json';
import vi from '../messages/vi.json';
import tr from '../messages/tr.json';
import th from '../messages/th.json';
import ko from '../messages/ko.json';
import it from '../messages/it.json';
import fa from '../messages/fa.json';
import tl from '../messages/tl.json';
import my from '../messages/my.json';
import am from '../messages/am.json';
import he from '../messages/he.json';
import mn from '../messages/mn.json';

const messagesMap: Record<string, any> = {
  zh, en, hi, es, ar, fr, pt, ru, ja, de, id, ur, bn, vi,
  tr, th, ko, it, fa, tl, my, am, he, mn,
};

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: messagesMap[locale] || messagesMap[routing.defaultLocale],
  };
});
