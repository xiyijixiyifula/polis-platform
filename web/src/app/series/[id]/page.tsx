import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import SeriesPageClient from './SeriesPageClient';

interface Props {
  params: { id: string };
}

const API_BASE = process.env.POLIS_API_URL || 'http://localhost:8080';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const token = cookies().get('polis_token')?.value;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/api/series/${params.id}`, { headers });
    const json = await res.json();
    const data = json?.data;

    if (data) {
      const title = data.title || '系列';
      const desc = data.description?.slice(0, 200) || '';
      return {
        title,
        description: desc,
        openGraph: {
          title: data.title || '内容系列',
          description: desc,
          type: 'article',
        },
        twitter: { card: 'summary', title: data.title || '内容系列', description: desc },
      };
    }
  } catch (e) { console.error('[SeriesPage] generateMetadata:', e); }

  return { title: '内容系列' };
}

export default function SeriesPage({ params }: Props) {
  return <SeriesPageClient seriesId={params.id} />;
}
