'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, FileText } from 'lucide-react';
import type { Series } from '@/lib/api';

interface SeriesCardProps {
  series: Series;
  namespace?: string;
}

export function SeriesCard({ series, namespace }: SeriesCardProps) {
  return (
    <Link
      href={`/series/${series.id}`}
      className="card block hover:border-primary-300 dark:hover:border-primary-600 transition-colors group"
    >
      <div className="flex items-start gap-3">
        {/* Cover or icon */}
        <div className="h-12 w-12 shrink-0 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
          {series.cover_url ? (
            <Image src={series.cover_url!} alt="" width={48} height={48} className="h-full w-full rounded-lg object-cover" unoptimized />
          ) : (
            <BookOpen className="h-5 w-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 truncate">
            {series.title}
          </h3>
          {series.description && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
              {series.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {series.post_count || 0} 篇
            </span>
            {series.author && (
              <span>
                @{series.author.username}
              </span>
            )}
            <span className="capitalize">
              {{'public':'公开', 'private':'私有', 'unlisted':'不公开'}[series.visibility] || series.visibility}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
