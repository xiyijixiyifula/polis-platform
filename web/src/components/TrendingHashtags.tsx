'use client';

import { useEffect, useState } from 'react';
import { Hash, TrendingUp } from 'lucide-react';
import { hashtags, Hashtag } from '@/lib/api';
import Link from 'next/link';

export default function TrendingHashtags() {
  const [tags, setTags] = useState<Hashtag[]>([]);

  useEffect(() => {
    hashtags.trending()
      .then(res => { if (res.data) setTags(res.data.slice(0, 10)); })
      .catch(() => {});
  }, []);

  if (tags.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
        <TrendingUp className="h-5 w-5 text-primary-500" />
        热门话题
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <Link
            key={t.id}
            href={`/hashtag/${encodeURIComponent(t.normalized_tag || t.tag)}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <Hash className="h-3 w-3" />
            {t.tag}
            {typeof t.post_count === 'number' && (
              <span className="text-xs text-gray-400 ml-0.5">
                {t.post_count}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
