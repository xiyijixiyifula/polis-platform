'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SpaceCard } from '@/components/SpaceCard';
import { TrendingUp, Users, FileText, Flame, Hash, Sparkles } from 'lucide-react';
import { formatCount } from '@/lib/utils';
import type { Space } from '@/lib/api';

export default function TrendingPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/spaces/trending')
      .then(r => r.json())
      .then(data => {
        if (data.code === 0) setSpaces(data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Sort by post_count for "hotness"
  const sorted = [...spaces].sort((a, b) => b.post_count - a.post_count);

  // Top 3 as featured
  const featured = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary-600" />
          热门社区
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">当前最活跃的社区</p>
      </div>

      {loading ? (
        <div className="card py-12 text-center text-gray-400 dark:text-gray-500">
          <div className="animate-pulse">加载中...</div>
        </div>
      ) : sorted.length > 0 ? (
        <>
          {/* Featured Top 3 */}
          {featured.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
              {featured.map((space, idx) => (
                <Link key={space.id} href={`/space/${space.namespace}`}>
                  <div className="card group cursor-pointer transition-all hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-600 relative overflow-hidden">
                    {/* Rank badge */}
                    <div className={`absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                      idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-400' : 'bg-amber-700'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-14 w-14 shrink-0 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-xl">
                        {space.title.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1 pr-10">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors truncate">
                            {space.title}
                          </h3>
                          {/* 根社区徽章已移除 */}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">/{space.namespace}</p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{space.description}</p>
                        <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {formatCount(space.member_count)} 成员
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            {formatCount(space.post_count)} 帖子
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Rest of the list */}
          {rest.length > 0 && (
            <>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Hash className="h-5 w-5 text-gray-400" />
                更多社区
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((space) => (
                  <SpaceCard key={space.id} space={{
                    id: space.id,
                    namespace: space.namespace,
                    title: space.title,
                    description: space.description,
                    icon_url: space.icon_url,
                    member_count: space.member_count,
                    post_count: space.post_count,
                    is_root: space.is_root,
                  }} />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Sparkles className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">暂无社区</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">成为第一个创建社区的人吧！</p>
          <Link href="/create" className="btn-primary mt-4 px-6 py-2">创建社区</Link>
        </div>
      )}
    </div>
  );
}
