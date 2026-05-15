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
