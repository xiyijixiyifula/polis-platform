import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import VideoPageClient from './VideoPageClient';

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

    const res = await fetch(`${API_BASE}/api/videos/${params.id}`, { headers });
    const json = await res.json();
    const data = json?.data;

    if (data) {
      const title = data.title ? `${data.title} | Polis` : '视频 | Polis';
      const desc = data.description?.slice(0, 200) || '';
      return {
        title,
        description: desc,
        openGraph: {
          title: data.title || '视频',
          description: desc,
          type: 'video.other',
        },
        twitter: { card: 'summary', title: data.title || '视频', description: desc },
      };
    }
  } catch {}

  return { title: '视频 | Polis' };
}

export default function VideoPage({ params, searchParams }: Props) {
  return <VideoPageClient videoId={params.id} spaceNs={searchParams.space} />;
}
