'use client';

import Link from 'next/link';
import { Play, Eye, Heart, Clock } from 'lucide-react';
import { formatCount } from '@/lib/utils';
import type { VideoItem } from '@/lib/api';

interface VideoCardProps {
  video: VideoItem;
  namespace: string;
  size?: 'sm' | 'md';
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** 视频卡片（小红书风格网格） */
export function VideoCard({ video, namespace, size = 'sm' }: VideoCardProps) {
  const linkHref = video.share_code && video.visibility === 'unlisted'
    ? `/video/share/${video.share_code}`
    : `/video/${video.id}?space=${encodeURIComponent(namespace)}`;

  if (size === 'sm') {
    return (
      <Link href={linkHref} className="group block">
        <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
          {video.thumbnail_url ? (
            <img src={video.thumbnail_url} alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
              <Play className="h-8 w-8 text-gray-400" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="h-5 w-5 text-gray-900 ml-0.5" />
            </div>
          </div>
          {video.duration_seconds && (
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-xs flex items-center gap-0.5">
              <Clock className="h-3 w-3" />{formatDuration(video.duration_seconds)}
            </div>
          )}
          {video.review_status === 'pending' && (
            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-amber-500 text-white text-xs">审核中</div>
          )}
        </div>
        <div className="mt-2 px-0.5">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 leading-tight">{video.title}</h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{formatCount(video.view_count)}</span>
            <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{formatCount(video.like_count)}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={linkHref} className="group card flex gap-3 hover:shadow-md transition-all">
      <div className="relative w-40 h-24 shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="h-8 w-8 text-gray-400" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          <Play className="h-8 w-8 text-white" />
        </div>
        {video.duration_seconds && (
          <div className="absolute bottom-1 right-1 px-1 rounded bg-black/60 text-white text-xs">{formatDuration(video.duration_seconds)}</div>
        )}
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary-600">{video.title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{video.description}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
          <span>@{video.uploader.username}</span>
          <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{formatCount(video.view_count)}</span>
          <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{formatCount(video.like_count)}</span>
        </div>
      </div>
    </Link>
  );
}
