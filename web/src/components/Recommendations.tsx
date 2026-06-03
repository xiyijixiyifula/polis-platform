'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Compass, Users, FileText } from 'lucide-react';
import { recommendations } from '@/lib/api';
import Link from 'next/link';
import { buildPostLink } from '@/lib/module-config';

export default function Recommendations() {
  const [data, setData] = useState<{ posts: any[]; spaces: any[]; users: any[] } | null>(null);

  useEffect(() => {
    recommendations.get('all')
      .then(res => { if (res.data) setData(res.data); })
      .catch(() => {});
  }, []);

  if (!data) return null;
  const { posts = [], spaces = [], users = [] } = data;
  if (posts.length === 0 && spaces.length === 0 && users.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-primary-500" />
        为你推荐
      </h3>

      {posts.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <FileText className="h-3 w-3" /> 推荐内容
          </p>
          <div className="space-y-1.5">
            {posts.slice(0, 3).map((post: any) => (
              <Link
                key={post.id}
                href={buildPostLink(post.id, post.space?.namespace || post.space_ns)}
                className="block px-2 py-2 hover:bg-white/30 dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {post.title || '无标题'}
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {post.author?.display_name || post.author?.username || '匿名'}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {spaces.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Compass className="h-3 w-3" /> 推荐社区
          </p>
          <div className="space-y-1.5">
            {spaces.slice(0, 3).map((space: any) => (
              <Link
                key={space.id}
                href={`/space/${space.namespace}`}
                className="block px-2 py-2 hover:bg-white/30 dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {space.title || space.name}
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {space.member_count ? `${space.member_count} 成员` : ''}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {users.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Users className="h-3 w-3" /> 推荐用户
          </p>
          <div className="space-y-1.5">
            {users.slice(0, 3).map((user: any) => (
              <Link
                key={user.id}
                href={`/profile/${user.username}`}
                className="flex items-center gap-3 px-2 py-2 hover:bg-white/30 dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-medium">
                  {(user.display_name || user.username || '?').charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.display_name || user.username}
                  </p>
                  <p className="text-xs text-gray-500">@{user.username}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
