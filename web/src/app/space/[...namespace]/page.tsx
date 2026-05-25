import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import SpacePageClient from './SpacePageClient';

interface Props {
  params: { namespace: string | string[] };
}

const API_BASE = process.env.POLIS_API_URL || 'http://localhost:8080';

/** Strip known sub-route suffixes to get the clean space namespace */
function cleanNamespace(ns: string): string {
  const known = new Set([
    'posts', 'polls', 'announcements', 'overview', 'members', 'video',
    'code_repo', 'qa', 'files', 'series', 'membership', 'novel', 'game',
    'mini_app', 'share', 'wiki', 'chat', 'store', 'course',
  ]);
  const parts = ns.split('/');
  if (parts.length > 1 && known.has(parts[parts.length - 1])) {
    return parts.slice(0, -1).join('/');
  }
  return ns;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const raw = Array.isArray(params.namespace)
      ? params.namespace.join('/')
      : (params.namespace || '');
    const ns = cleanNamespace(raw);

    const token = cookies().get('polis_token')?.value;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/api/spaces/${encodeURIComponent(ns)}`, { headers });
    const json = await res.json();
    const data = json?.data;

    if (data) {
      const title = data.title ? `${data.title} | Polis` : '社区 | Polis';
      const desc = data.description?.slice(0, 200) || `Polis 社区: ${ns}`;
      return {
        title,
        description: desc,
        openGraph: {
          title: data.title || ns,
          description: desc,
          type: 'website',
        },
        twitter: { card: 'summary', title: data.title || ns, description: desc },
      };
    }
  } catch {}

  return { title: '社区 | Polis' };
}

export default function SpacePage({ params }: Props) {
  return <SpacePageClient rawNamespace={params.namespace} />;
}
