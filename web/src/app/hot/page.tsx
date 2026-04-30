'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SpaceCard } from '@/components/SpaceCard';
import { TrendingUp, Hash, Sparkles } from 'lucide-react';
import type { Space } from '@/lib/api';

export default function HotPage() {
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

  const sorted = [...spaces].sort((a, b) => b.member_count - a.member_count); // 热榜按成员数排

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-12 text-center text-gray-400 dark:text-gray-500 animate-pulse">加载中...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
        <TrendingUp className="h-6 w-6 text-orange-500" />
        热榜
      </h1>

      {sorted.length > 0 ? (
        <div className="space-y-3">
          {sorted.map((space, idx) => (
            <Link key={space.id} href={`/space/${space.namespace}`}>
              <div className="card flex items-center gap-4 group cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-all py-3 px-4">
                <span className={`w-8 text-center font-bold text-lg ${
                  idx === 0 ? 'text-amber-500' :
                  idx === 1 ? 'text-gray-400' :
                  idx === 2 ? 'text-amber-700' :
                  'text-gray-300 dark:text-gray-600'
                }`}>
                  {idx + 1}
                </span>
                <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm">
                  {space.title.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">{space.title}</h3>
                    {space.is_root && <span className="rounded bg-primary-100 dark:bg-primary-900/30 px-1.5 py-0.5 text-[10px] text-primary-700 dark:text-primary-400">根社区</span>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">/{space.namespace} · {space.description}</p>
                </div>
                <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                  <p className="font-semibold text-gray-900 dark:text-white">{space.member_count.toLocaleString()}</p>
                  <p>成员</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Sparkles className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">暂无社区</p>
        </div>
      )}
    </div>
  );
}
