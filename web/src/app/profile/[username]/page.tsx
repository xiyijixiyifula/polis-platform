'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, UserPlus, Users, UserCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { users, follow, type User, type FollowUser } from '@/lib/api';
import { SpaceCard } from '@/components/SpaceCard';

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

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const [user, setUser] = useState<User | null>(null);
  const [userSpaces, setUserSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [followingList, setFollowingList] = useState<FollowUser[]>([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [isSelf, setIsSelf] = useState(false);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    (async () => {
      try {
        const res = await users.getProfile(username);
        if (res.code === 0 && res.data) {
          setUser(res.data);
          const stored = localStorage.getItem('polis_user');
          if (stored) {
            try {
              const me = JSON.parse(stored);
              setIsSelf(me.username === username || me.id === res.data.id);
            } catch {}
          }
        } else {
          setError('用户不存在');
        }
      } catch {
        setError('加载失败');
      }

      try {
        const token = localStorage.getItem('polis_access_token');
        const spRes = await fetch('/api/users/' + username + '/spaces', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const spData = await spRes.json();
        if (spData.code === 0 && spData.data) {
          setUserSpaces(spData.data);
        }
      } catch {}

      await loadFollowCounts();
      setLoading(false);
    })();
  }, [username]);

  const loadFollowCounts = async () => {
    try {
      const fRes = await follow.followers(username);
      if (fRes.code === 0 && fRes.data) setFollowerCount(fRes.data.length);
    } catch {}
    try {
      const fgRes = await follow.following(username);
      if (fgRes.code === 0 && fgRes.data) setFollowingCount(fgRes.data.length);
    } catch {}
  };

  const loadFollowers = async () => {
    if (showFollowers) { setShowFollowers(false); return; }
    setShowFollowing(false);
    setListLoading(true);
    try {
      const res = await follow.followers(username);
      if (res.code === 0 && res.data) setFollowers(res.data);
    } catch {}
    setListLoading(false);
    setShowFollowers(true);
  };

  const loadFollowing = async () => {
    if (showFollowing) { setShowFollowing(false); return; }
    setShowFollowers(false);
    setListLoading(true);
    try {
      const res = await follow.following(username);
      if (res.code === 0 && res.data) setFollowingList(res.data);
    } catch {}
    setListLoading(false);
    setShowFollowing(true);
  };

  const handleFollow = async () => {
    if (!user || !user.id) return;
    const token = localStorage.getItem('polis_access_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    setFollowLoading(true);
    try {
      const res = await follow.toggle('user', user.id);
      if (res.code === 0) {
        const nowFollowing = res.data ?? false;
        setIsFollowing(nowFollowing);
        setFollowerCount(prev => nowFollowing ? prev + 1 : Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error('Follow toggle failed:', e);
    }
    setFollowLoading(false);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="card animate-pulse space-y-4">
          <div className="h-20 w-20 bg-gray-200 rounded-full" />
          <div className="h-6 w-1/3 bg-gray-200 rounded" />
          <div className="h-4 w-1/2 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center">
        <div className="text-4xl mb-4">😕</div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{error || '用户不存在'}</h2>
        <Link href="/" className="text-sm text-primary-600 hover:underline">返回首页</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="h-20 w-20 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-3xl">
            {user.display_name?.charAt(0) || '?'}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.display_name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
              </div>
              {!isSelf && (
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`inline-flex items-center gap-1.5 text-sm px-5 py-2 rounded-lg font-medium transition-all ${
                    isFollowing
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400'
                      : 'btn-primary'
                  }`}
                >
                  {followLoading ? (
                    <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : isFollowing ? (
                    <><UserCheck className="h-4 w-4" /> 已关注</>
                  ) : (
                    <><UserPlus className="h-4 w-4" /> 关注</>
                  )}
                </button>
              )}
            </div>
            {user.bio && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{user.bio}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(user.created_at)} 加入
              </span>
              <button onClick={loadFollowers} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">
                <Users className="h-3.5 w-3.5" />
                <span className="font-semibold text-gray-700 dark:text-gray-300">{followerCount}</span> 粉丝
              </button>
              <button onClick={loadFollowing} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{followingCount}</span> 关注
              </button>
              {user.verified && (
                <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-medium">✓ 已认证</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {showFollowers && (
        <div className="mt-4 card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="h-4 w-4" /> 粉丝 ({followerCount})
            </h3>
            <button onClick={() => setShowFollowers(false)} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">关闭</button>
          </div>
          <FollowList users={followers} loading={listLoading} emptyText="暂无粉丝" />
        </div>
      )}

      {showFollowing && (
        <div className="mt-4 card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> 关注 ({followingCount})
            </h3>
            <button onClick={() => setShowFollowing(false)} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">关闭</button>
          </div>
          <FollowList users={followingList} loading={listLoading} emptyText="还没有关注任何人" />
        </div>
      )}

      {userSpaces.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            社区 ({userSpaces.length})
          </h2>
          <div className="space-y-3">
            {userSpaces.map((sp: any) => (
              <SpaceCard key={sp.id || sp.namespace} space={{
                id: sp.id,
                namespace: sp.namespace,
                title: sp.title,
                description: sp.description || '',
                icon_url: sp.icon_url || null,
                member_count: sp.member_count || 0,
                post_count: sp.post_count || 0,
                is_root: sp.is_root || false,
                owner_id: sp.owner_id || null,
              }} />
            ))}
          </div>
        </div>
      )}

      {!loading && userSpaces.length === 0 && (
        <div className="mt-6 card py-8 text-center text-gray-500 dark:text-gray-400">
          <p className="text-sm">该用户还没有加入任何社区</p>
        </div>
      )}
    </div>
  );
}
