'use client';

import { useEffect, useState, useRef } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { editorPicks, EditorPick } from '@/lib/api';
import Link from 'next/link';
import { buildPostLink } from '@/lib/module-config';

export default function EditorPicks() {
  const [picks, setPicks] = useState<EditorPick[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    editorPicks.get()
      .then(res => { if (res.data) setPicks(res.data); })
      .catch(() => {});
  }, []);

  if (picks.length === 0) return null;

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 300;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <div className="relative mb-4 mx-4">
      <div className="flex items-center gap-2 mb-2">
        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">编辑精选</span>
      </div>
      <div className="relative">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-white/80 dark:bg-gray-800/80 shadow"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide py-2 px-1"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {picks.map((pick) => {
            const href = pick.target_type === 'space'
              ? `/space/${(pick as any).namespace || ''}`
              : buildPostLink(pick.target_id, (pick as any).namespace || (pick as any).space_ns);
            return (
              <Link
                key={pick.id}
                href={href}
                className="shrink-0 w-64 glass-card p-4 hover:scale-[1.02] transition-transform"
                style={{ scrollSnapAlign: 'start' }}
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">
                  {pick.title_override || (pick as any).title || '编辑精选'}
                </p>
                {pick.description_override && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {pick.description_override}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-white/80 dark:bg-gray-800/80 shadow"
        >
          <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </div>
  );
}
