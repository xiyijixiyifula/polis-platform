import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return d.toLocaleDateString('zh-CN');
}

export function formatCount(count: number): string {
  try {
    if (count >= 10000) {
      return (count / 10000).toFixed(1) + '万';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  } catch (e) {
    console.warn('[formatCount] Failed to format value:', count, e);
    return String(count);
  }
}

/** 移除 Markdown 格式，提取纯文本 */
export function stripMarkdown(md: string): string {
  if (!md) return '';
  return md
    // 代码块（包含表格 Markdown 会被 code 块保护）
    .replace(/```[\s\S]*?```/g, ' ')
    // 行内代码
    .replace(/`([^`]*)`/g, '$1')
    // 表格 — 移除整行分隔符和管道符
    .replace(/^\|?\s*[-:]{3,}\s*(\|[-:\s]+)*$/gm, '')
    .replace(/^\|(.+)\|$/gm, (_, row) => row.replace(/\|/g, ' '))
    // 图片
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    // 链接 -> 保留文字
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // 标题
    .replace(/^#{1,6}\s+/gm, '')
    // 粗体/斜体/删除线
    .replace(/(\*{1,3}|_{1,3}|~~)(.*?)\1/g, '$2')
    // 列表标记
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // 引用标记
    .replace(/^>\s?/gm, '')
    // HTML 标签
    .replace(/<[^>]*>/g, '')
    // 水平线
    .replace(/^(-{3,}|_{3,}|\*{3,})$/gm, '')
    // 多余空白
    .replace(/\n{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Encode a space namespace for safe use in URLs.
 * Replaces '/' with '~' (URL-unreserved, safe character) to avoid %2F
 * which Next.js blocks in URLs.
 */
export function encodeSpaceForUrl(namespace: string): string {
  return namespace.replace(/\//g, '~');
}

/**
 * Decode a space namespace from a URL parameter.
 * Reverts the '~' back to '/' to reconstruct the original namespace.
 */
export function decodeSpaceFromUrl(encoded: string): string {
  return encoded.replace(/~/g, '/');
}

/** 解析文本中的 @提及 和 #话题，返回结构化数组供渲染使用 */
export function parseInlineRefs(text: string): Array<{ type: 'text' | 'mention' | 'hashtag'; value: string }> {
  if (!text) return [];
  const re = /(@[一-鿿\w]+|#[一-鿿\w]+)/g;
  const parts = text.split(re);
  return parts.filter(Boolean).map((part) => {
    if (part.startsWith('@')) return { type: 'mention', value: part.slice(1) };
    if (part.startsWith('#')) return { type: 'hashtag', value: part.slice(1) };
    return { type: 'text', value: part };
  });
}

/** 将正文中的 @提及 和 #话题 转换为 Markdown 链接，供 CherryRender/Markdown 渲染器使用 */
export function convertInlineRefsToMarkdown(text: string): string {
  if (!text) return text;
  // 保护代码块和行内代码
  const codeBlocks: string[] = [];
  let protected_ = text.replace(/```[\s\S]*?```/g, (m) => { codeBlocks.push(m); return `\x00CODEBLOCK${codeBlocks.length - 1}\x00`; });
  protected_ = protected_.replace(/`[^`]+`/g, (m) => { codeBlocks.push(m); return `\x00CODEBLOCK${codeBlocks.length - 1}\x00`; });
  // 保护已有链接 [text](url)
  protected_ = protected_.replace(/\[([^\]]*)\]\([^)]+\)/g, (m) => { codeBlocks.push(m); return `\x00CODEBLOCK${codeBlocks.length - 1}\x00`; });
  // 转换 @提及 和 #话题
  protected_ = protected_.replace(/(^|\s)@([一-鿿\w]+)/g, '$1[@$2](/profile/$2)');
  protected_ = protected_.replace(/(^|\s)#([一-鿿\w]+)/g, '$1[#$2](/hashtag/$2)');
  // 恢复保护的内容
  protected_ = protected_.replace(/\x00CODEBLOCK(\d+)\x00/g, (_, i) => codeBlocks[parseInt(i)] || '');
  return protected_;
}

/** 估算阅读时间 (基于中英文混合内容, 300字/分钟) */
export function estimateReadTime(body: string): string {
  if (!body) return '1 分钟';
  const plain = stripMarkdown(body);
  // Count Chinese characters (CJK range) + English words
  const chineseChars = (plain.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const englishWords = plain.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, '').trim().split(/\s+/).filter(w => w.length > 0).length;
  // Chinese: ~300 chars/min, English: ~200 words/min
  const minutes = Math.max(1, Math.ceil(chineseChars / 300 + englishWords / 200));
  return `${minutes} 分钟`;
}

// --- Recently Viewed Spaces ---

const RECENT_SPACES_KEY = 'polis_recent_spaces';
const MAX_RECENT_SPACES = 10;

export interface RecentSpace {
  namespace: string;
  title: string;
  icon_url: string | null;
  viewed_at: number;
}

/** Record a space view. Call from space pages. */
export function recordSpaceView(space: { namespace: string; title: string; icon_url?: string | null }) {
  try {
    const raw = localStorage.getItem(RECENT_SPACES_KEY);
    let list: RecentSpace[] = raw ? JSON.parse(raw) : [];
    // Remove existing entry for same namespace
    list = list.filter(s => s.namespace !== space.namespace);
    // Prepend new entry
    list.unshift({
      namespace: space.namespace,
      title: space.title,
      icon_url: space.icon_url || null,
      viewed_at: Date.now(),
    });
    // Trim to max
    if (list.length > MAX_RECENT_SPACES) list = list.slice(0, MAX_RECENT_SPACES);
    localStorage.setItem(RECENT_SPACES_KEY, JSON.stringify(list));
  } catch (e) { console.warn('[recordSpaceView] Failed to save to localStorage:', e); }
}
