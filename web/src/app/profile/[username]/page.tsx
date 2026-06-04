import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import ProfilePageClient from './ProfilePageClient';

interface Props {
  params: { username: string };
}

const API_BASE = process.env.POLIS_API_URL || 'http://localhost:8080';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const token = cookies().get('polis_token')?.value;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/api/users/${params.username}`, { headers });
    const json = await res.json();
    const data = json?.data;

    if (data) {
      const name = data.display_name || data.username || params.username;
      const title = `${name} (@${data.username || params.username})`;
      const desc = data.bio?.slice(0, 200) || `${name} 的个人主页`;
      return {
        title,
        description: desc,
        openGraph: {
          title: `${name} 的个人主页`,
          description: desc,
          type: 'profile',
        },
        twitter: { card: 'summary', title, description: desc },
      };
    }
  } catch (e) {
    console.error('Failed to generate profile metadata:', e);
  }

  return { title: '用户主页' };
}

export default function ProfilePage({ params }: Props) {
  return <ProfilePageClient username={params.username} />;
}
