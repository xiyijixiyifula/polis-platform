'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PostCard } from '@/components/PostCard';
import { Settings, Calendar, Users, UserCheck } from 'lucide-react';
import { users, posts, follow, type User, type FollowUser } from '@/lib/api';
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

function FollowList({ users: list, loading, emptyText }: {
  users: FollowUser[];
  loading: boolean;
  emptyText: string;
}) {
  if (loading) return <div className="text-center py-8 text-gray-500 dark:text-gray-400">加载中...</div>;
  if (list.length === 0) return <div className="text-center py-8 text-gray-500 dark:text-gray-400">{emptyText}</div>;
  return (
    <div className="space-y-2">
      {list.map((u: FollowUser) => (
        <Link key={u.id} href={`/profile/${u.username}`}
          className="card flex items-center gap-3 py-3 px-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm">
            {u.display_name?.charAt(0) || '?'}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{u.display_name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">@{u.username}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [followingList, setFollowingList] = useState<FollowUser[]>([]);
  const [listLoading, setListLoading] = useState(false);

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

      // Load follow counts
      try {
        const fRes = await follow.followers(user.username);
        if (fRes.code === 0 && fRes.data) setFollowerCount(fRes.data.length);
      } catch {}
      try {
        const fgRes = await follow.following(user.username);
        if (fgRes.code === 0 && fgRes.data) setFollowingCount(fgRes.data.length);
      } catch {}

      setLoading(false);
    })();
  }, [user]);

  const loadFollowers = async () => {
    if (!user) return;
    setListLoading(true);
    try {
      const res = await follow.followers(user.username);
      if (res.code === 0 && res.data) setFollowers(res.data);
    } catch {}
    setListLoading(false);
    setActiveTab('followers');
  };

  const loadFollowing = async () => {
    if (!user) return;
    setListLoading(true);
    try {
      const res = await follow.following(user.username);
      if (res.code === 0 && res.data) setFollowingList(res.data);
    } catch {}
    setListLoading(false);
    setActiveTab('following');
  };

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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{displayUser.display_name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">@{displayUser.username}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/settings" className="btn-secondary text-sm px-4 py-1.5">
                  <Settings className="h-4 w-4 mr-1 inline" />
                  编辑资料
                </Link>
              </div>
            </div>
            {displayUser.bio && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{displayUser.bio}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(displayUser.created_at)} 加入
              </span>
              <button onClick={loadFollowers} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">
                <Users className="h-3.5 w-3.5" />
                <span className="font-semibold text-gray-700 dark:text-gray-300">{followerCount}</span> 粉丝
              </button>
              <button onClick={loadFollowing} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{followingCount}</span> 关注
              </button>
              {displayUser.verified && (
                <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-medium">✓ 已认证</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 mb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-0">
          {['posts', 'spaces', 'followers', 'following'].map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); if (tab === 'followers') loadFollowers(); if (tab === 'following') loadFollowing(); }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              {{posts:'帖子', spaces:'社区', followers: `粉丝 (${followerCount})`, following: `关注 (${followingCount})`}[tab]}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'posts' && (
        loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded" />
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
          <div className="card py-12 text-center text-gray-500 dark:text-gray-400">
            <div className="text-3xl mb-2">📝</div>
            <p className="text-sm">还没有发布过帖子</p>
            <Link href="/explore" className="mt-2 inline-block text-sm text-primary-600 hover:underline">
              去探索社区发帖 →
            </Link>
          </div>
        )
      )}

      {activeTab === 'spaces' && (
        <div className="card py-12 text-center text-gray-500 dark:text-gray-400">
          <div className="text-3xl mb-2">🏛️</div>
          <p className="text-sm">还没有创建社区</p>
          <Link href="/create" className="mt-2 inline-block text-sm text-primary-600 hover:underline">
            创建你的第一个社区 →
          </Link>
        </div>
      )}

      {activeTab === 'followers' && (
        <FollowList users={followers} loading={listLoading} emptyText="暂无粉丝" />
      )}

      {activeTab === 'following' && (
        <FollowList users={followingList} loading={listLoading} emptyText="还没有关注任何人" />
      )}
    </div>
  );
}
