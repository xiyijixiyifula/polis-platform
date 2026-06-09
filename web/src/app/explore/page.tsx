'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SpaceCard } from '@/components/SpaceCard';
import { Search, TrendingUp, Sparkles } from 'lucide-react';
import type { Space } from '@/lib/api';

export default function ExplorePage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/spaces/trending')
      .then(r => r.json())
      .then(data => {
        if (data.code === 0) setSpaces(data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = spaces.filter(s =>
    !search || s.title.includes(search) || s.namespace.includes(search) || s.description.includes(search)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary-600" />
            探索社区
          </h1>
          <p className="mt-1 text-gray-500">发现热门社区和优质内容</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索社区..."
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
              <div className="flex items-center gap-2 pt-2">
                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((space) => (
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
      ) : (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Sparkles className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">
            {search ? '🔍 没有找到匹配的社区' : '🏘️ 暂无社区'}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {search ? '试试其他关键词' : '成为第一个创建社区的人吧！'}
          </p>
          <Link href="/create" className="btn-primary mt-4 px-6 py-2">创建社区</Link>
        </div>
      )}
    </div>
  );
}
