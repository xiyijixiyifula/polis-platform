import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import PostPageClient from './PostPageClient';

interface Props {
  params: { id: string };
  searchParams: { space?: string };
}

const API_BASE = process.env.POLIS_API_URL || 'http://localhost:8080';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const token = cookies().get('polis_token')?.value;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/api/posts/${params.id}`, { headers });
    const json = await res.json();
    const data = json?.data;

    if (data) {
      const title = data.title ? `${data.title} | Polis` : '帖子详情 | Polis';
      const desc = data.body?.replace(/<[^>]+>/g, '').slice(0, 200) || '';
      return {
        title,
        description: desc,
        openGraph: {
          title: data.title || '帖子详情',
          description: desc,
          type: 'article',
        },
        twitter: { card: 'summary', title: data.title || '帖子详情', description: desc },
      };
    }
  } catch {}

  return { title: '帖子详情 | Polis' };
}

export default function PostPage({ params, searchParams }: Props) {
  return <PostPageClient id={params.id} space={searchParams.space} />;
}
