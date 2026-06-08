'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserCheck } from 'lucide-react';
import { follow, type FollowUser } from '@/lib/api';

function FollowCard({ user }: { user: FollowUser }) {
  return (
    <Link
      href={`/profile/${user.username}`}
      className="card flex items-center gap-3 py-3 px-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
    >
      <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm">
        {user.display_name?.charAt(0) || user.username?.charAt(0) || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {user.display_name || user.username}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          @{user.username}
        </p>
      </div>
    </Link>
  );
}

export default function FollowingPage() {
  const params = useParams();
  const username = params.username as string;

  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    follow.following(username).then(res => {
      if (res.code === 0 && res.data) {
        setFollowing(res.data);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [username]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/profile/${username}`}
          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            @{username} 关注的人
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            关注了 {following.length} 人
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <span className="inline-block h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2 align-middle"></span>加载中...
        </div>
      ) : following.length > 0 ? (
        <div className="space-y-2">
          {following.map((u) => (
            <FollowCard key={u.id} user={u} />
          ))}
        </div>
      ) : (
        <div className="card py-12 text-center text-gray-400 dark:text-gray-500">
          <UserCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>👤 暂无关注</p>
          <p className="text-sm mt-1">@{username} 👤 还没有关注任何人</p>
        </div>
      )}
    </div>
  );
}
