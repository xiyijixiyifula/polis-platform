'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Upload, Globe, Lock, Film } from 'lucide-react';
import { VideoCard } from './VideoCard';
import { videos, type VideoItem } from '@/lib/api';

interface SpaceVideoTabProps {
  namespace: string;
  spaceId: string | null;
  isOwner: boolean;
}

/** 空间视频 Tab — 小米风格网格 */
export function SpaceVideoTab({ namespace, spaceId, isOwner }: SpaceVideoTabProps) {
  const [videoList, setVideoList] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all'|'public'|'private'>('all');

  // load
  useEffect(() => {
    videos.list(namespace).then(res => {
      if (res.code === 0 && res.data) setVideoList(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [namespace]);

  const filtered = videoList.filter(v => {
    if (filter === 'public') return v.visibility === 'public';
    if (filter === 'private') return v.visibility === 'private' || v.visibility === 'unlisted';
    return true;
  });

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mt-2 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* top bar: upload link + filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {isOwner && (
          <Link href={`/creations/new?type=video&space=${encodeURIComponent(namespace)}`}
            className="card flex items-center gap-3 hover:border-primary-400 transition-colors group py-3 px-4">
            <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-red-400 to-pink-600 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">发布视频</p>
              <p className="text-xs text-gray-400">前往创作中心上传</p>
            </div>
          </Link>
        )}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          {[
            { key: 'all' as const, label: '全部', icon: null },
            { key: 'public' as const, label: '公开', icon: Globe },
            { key: 'private' as const, label: '私密', icon: Lock },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === key ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
              {Icon && <Icon className="h-3 w-3" />}{label}
            </button>
          ))}
        </div>
      </div>

      {/* video grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(v => <VideoCard key={v.id} video={v} namespace={namespace} size="sm" />)}
        </div>
      ) : (
        <div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500">
          <Upload className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>暂无视频</p>
          {isOwner && (
            <Link href={`/creations/new?type=video&space=${encodeURIComponent(namespace)}`}
              className="text-sm text-primary-600 hover:underline mt-1 inline-block">
              去创作中心上传第一个视频 →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
