import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import PostPageClient from './PostPageClient';

interface Props {
  params: { id: string };
  searchParams: { space?: string };
}

const API_BASE = process.env.POLIS_API_URL || 'http://localhost:8080';

/** 去除 Markdown 和 HTML，提取纯文本摘要（最多 maxLen 字符） */
function plainText(md: string, maxLen = 160): string {
  if (!md) return '';
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*{1,3}|_{1,3}|~~)(.*?)\1/g, '$2')
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/<[^>]*>/g, '')
    .replace(/^\|?\s*[-:]{3,}\s*(\|[-:\s]+)*$/gm, '')
    .replace(/^\|(.+)\|$/gm, (_, row: string) => row.replace(/\|/g, ' '))
    .replace(/\n{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const token = cookies().get('polis_token')?.value;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/api/posts/${params.id}`, { headers });
    const json = await res.json();
    const data = json?.data;

    if (data) {
      const title = data.title || '帖子详情';
      const desc = plainText(data.body || '');
      const coverUrl = data.cover_url || (data.media_urls?.[0]) || null;
      const ogImages = coverUrl
        ? [{ url: coverUrl, width: 1200, height: 630, alt: title }]
        : [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Polis' }];

      return {
        title,
        description: desc,
        openGraph: {
          title,
          description: desc,
          type: 'article',
          images: ogImages,
          publishedTime: data.created_at || undefined,
          modifiedTime: data.updated_at || undefined,
          authors: data.author?.display_name ? [data.author.display_name] : undefined,
          tags: data.tags || undefined,
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description: desc,
          images: coverUrl ? [coverUrl] : ['/og-image.png'],
        },
      };
    }
  } catch (e) { console.error('[PostPage] generateMetadata:', e); }

  return { title: '帖子详情' };
}

export default function PostPage({ params, searchParams }: Props) {
  return <PostPageClient id={params.id} space={searchParams.space} />;
}
