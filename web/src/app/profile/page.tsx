'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PostCard } from '@/components/PostCard';
import { Settings, Calendar } from 'lucide-react';
import { users, posts, User } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface StoredUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  verified: boolean;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');

  useEffect(() => {
    const stored = localStorage.getItem('polis_user');
    if (!stored) {
      router.push('/login');
      return;
    }
    try {
      const u = JSON.parse(stored) as StoredUser;
      setUser(u);
    } catch {
      router.push('/login');
      return;
    }
  }, [router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    (async () => {
      try {
        const res = await users.getProfile(user.username);
        if (res.data) setProfile(res.data);
      } catch {}

      try {
        const spacesRes = await fetch('/api/users/' + user.username + '/spaces', {
          headers: { Authorization: `Bearer ${localStorage.getItem('polis_access_token')}` },
        });
        const spacesData = await spacesRes.json();
        if (spacesData.code === 0 && spacesData.data?.length > 0) {
          const userSpaces: any[] = spacesData.data;
          const allPosts: any[] = [];
          for (const sp of userSpaces.slice(0, 3)) {
            try {
              const ns = sp.namespace || sp.slug || sp.id;
              const postRes = await posts.list(ns, { page_size: 5 });
              if (postRes.data) {
                for (const p of postRes.data) {
                  allPosts.push({ ...p, space_ns: ns, space_name: sp.title });
                }
              }
            } catch {}
          }
          setUserPosts(allPosts);
        }
      } catch {}
      setLoading(false);
    })();
  }, [user]);

  if (!user) return null;

  const displayUser = profile || user;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="h-20 w-20 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-3xl">
            {displayUser.display_name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{displayUser.display_name}</h1>
                <p className="text-sm text-gray-500">@{displayUser.username}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/settings" className="btn-secondary text-sm px-4 py-1.5">
                  <Settings className="h-4 w-4 mr-1 inline" />
                  编辑资料
                </Link>
              </div>
            </div>
            {displayUser.bio && (
              <p className="mt-2 text-sm text-gray-600">{displayUser.bio}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(displayUser.created_at)} 加入
              </span>
              {displayUser.verified && (
                <span className="inline-flex items-center gap-0.5 text-blue-600 font-medium">✓ 已认证</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 mb-4 border-b border-gray-200">
        <div className="flex gap-0">
          {['posts', 'spaces'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {{posts:'帖子', spaces:'社区'}[tab]}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'posts' && (
        loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 w-2/3 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-full bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : userPosts.length > 0 ? (
          <div className="space-y-3">
            {userPosts.map((p: any) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        ) : (
          <div className="card py-12 text-center text-gray-500">
            <div className="text-3xl mb-2">📝</div>
            <p className="text-sm">还没有发布过帖子</p>
            <Link href="/explore" className="mt-2 inline-block text-sm text-primary-600 hover:underline">
              去探索社区发帖 →
            </Link>
          </div>
        )
      )}

      {activeTab === 'spaces' && (
        <div className="card py-12 text-center text-gray-500">
          <div className="text-3xl mb-2">🏛️</div>
          <p className="text-sm">还没有创建社区</p>
          <Link href="/create" className="mt-2 inline-block text-sm text-primary-600 hover:underline">
            创建你的第一个社区 →
          </Link>
        </div>
      )}
    </div>
  );
}
