'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, Layers, Clock, User, Globe, Lock, EyeOff } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Series } from '@/lib/api';

const COVER_GRADIENTS = [
  'from-indigo-400 to-purple-600',
  'from-blue-400 to-cyan-600',
  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-600',
  'from-violet-400 to-indigo-600',
];

const VISIBILITY_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  public: { label: '公开', icon: <Globe className="h-3 w-3" />, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  private: { label: '私有', icon: <Lock className="h-3 w-3" />, className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  unlisted: { label: '不公开', icon: <EyeOff className="h-3 w-3" />, className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
};

export function SeriesCard({ series, namespace }: {
  series: Series;
  namespace?: string;
}) {
  const authorName = series.author?.display_name || series.author?.username || '匿名';
  const gradientIdx = series.title.length % COVER_GRADIENTS.length;
  const coverGradient = COVER_GRADIENTS[gradientIdx];
  const visibility = VISIBILITY_CONFIG[series.visibility] || VISIBILITY_CONFIG.public;
  const desc = series.description ? series.description.slice(0, 100) : '';

  return (
    <Link
      href={`/series/${series.id}`}
      className="glass-card group hover:border-indigo-400 dark:hover:border-indigo-600 transition-all duration-200 overflow-hidden flex"
    >
      {/* Cover */}
      <div className={`w-24 sm:w-28 shrink-0 bg-gradient-to-br ${coverGradient} flex items-center justify-center relative`}>
        {series.cover_url ? (
          <img src={series.cover_url} alt={series.title} className="w-full h-full object-cover" />
        ) : (
          <BookOpen className="h-8 w-8 text-white/70" />
        )}
        <span className={`absolute bottom-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium inline-flex items-center gap-0.5 ${visibility.className}`}>
          {visibility.icon} {visibility.label}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 leading-snug mb-1">
            {series.title}
          </h3>
          {desc && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{desc}</p>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400 dark:text-gray-500">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-0.5"><User className="h-3 w-3" /> {authorName}</span>
            <span className="inline-flex items-center gap-0.5">
              <Layers className="h-3 w-3" /> {series.post_count || 0} 篇
            </span>
          </div>
          {series.created_at && (
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-3 w-3" /> {formatDate(series.created_at)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
