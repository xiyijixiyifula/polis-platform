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
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + '万';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k';
  }
  return count.toString();
}

/** 估算阅读时间 (基于中英文混合内容, 300字/分钟) */
export function estimateReadTime(body: string): string {
  if (!body) return '1 分钟';
  // Remove Markdown syntax (headings, links, code blocks, images)
  const plain = body
    .replace(/#{1,6}\s+/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/[*_~>|]/g, '')
    .replace(/\n+/g, ' ');
  // Count Chinese characters (CJK range) + English words
  const chineseChars = (plain.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const englishWords = plain.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, '').trim().split(/\s+/).filter(w => w.length > 0).length;
  // Chinese: ~300 chars/min, English: ~200 words/min
  const minutes = Math.max(1, Math.ceil(chineseChars / 300 + englishWords / 200));
  return `${minutes} 分钟`;
}
