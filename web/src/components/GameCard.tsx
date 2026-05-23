'use client';

import React from 'react';
import Link from 'next/link';
import { Gamepad2, Heart, Eye, Clock, Monitor, Smartphone, Globe } from 'lucide-react';
import { formatCount, formatDate, stripMarkdown } from '@/lib/utils';
import { buildPostLink } from '@/lib/module-config';

interface GamePost {
  id: string;
  title: string;
  body?: string;
  author?: { username?: string; display_name?: string; avatar_url?: string | null } | null;
  tags?: string[];
  like_count?: number;
  comment_count?: number;
  view_count?: number;
  created_at?: string;
  is_pinned?: boolean;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  pc: <Monitor className="h-3 w-3" />,
  mobile: <Smartphone className="h-3 w-3" />,
  web: <Globe className="h-3 w-3" />,
  console: <Gamepad2 className="h-3 w-3" />,
};

const PLATFORM_LABELS: Record<string, string> = {
  pc: 'PC', mobile: '手游', web: '页游', console: '主机',
};

const GAME_TAG_COLORS: Record<string, string> = {
  '攻略': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  '评测': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  '资讯': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  '技巧': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'MOD': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  '安利': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  '剧情': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

function extractPlatforms(tags: string[]): string[] {
  const known = ['pc', 'mobile', 'web', 'console', 'PC', '手游', '页游', '主机', 'steam', 'switch', 'ps5', 'xbox'];
  return tags.filter(t => known.includes(t.toLowerCase())).map(t => t.toLowerCase());
}

function getGameCategory(tags: string[]): string | null {
  return tags.find(t => t in GAME_TAG_COLORS) || null;
}

export default function GameCard({ post, spaceNs, spaceName }: {
  post: GamePost;
  spaceNs?: string;
  spaceName?: string;
}) {
  const platforms = extractPlatforms(post.tags || []);
  const category = getGameCategory(post.tags || []);
  const preview = post.body ? stripMarkdown(post.body).slice(0, 120) : '';
  const authorName = post.author?.display_name || post.author?.username || '匿名';
  const postLink = buildPostLink(post.id, spaceNs);
  const titleParts = post.title.match(/^(.+?)\s*[-|]\s*(.+)$/);
  const gameName = titleParts ? titleParts[1] : null;
  const displayTitle = titleParts ? titleParts[2] : post.title;

  return (
    <Link href={postLink}
      className="glass-card group hover:border-green-400 dark:hover:border-green-600 transition-all duration-200 overflow-hidden flex flex-col">
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
              <Gamepad2 className="h-3.5 w-3.5 text-white" />
            </div>
            {gameName && (
              <span className="text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                {gameName}
              </span>
            )}
          </div>
          {platforms.length > 0 && (
            <div className="flex items-center gap-1">
              {platforms.slice(0, 3).map(p => (
                <span key={p} className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                  {PLATFORM_ICONS[p] || null} {PLATFORM_LABELS[p] || p}
                </span>
              ))}
            </div>
          )}
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors line-clamp-2 leading-snug">
          {post.is_pinned && <span className="inline-flex items-center mr-1 text-[10px] text-red-500">📌</span>}
          {displayTitle}
        </h3>
        {preview && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">{preview}</p>
        )}
      </div>
      {post.tags && post.tags.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {post.tags.slice(0, 4).map(tag => {
            const color = GAME_TAG_COLORS[tag] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
            return <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${color}`}>{tag}</span>;
          })}
        </div>
      )}
      <div className="mt-auto px-4 py-2.5 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
        <div className="flex items-center gap-1 min-w-0">
          <span className="truncate max-w-[80px]">{authorName}</span>
          {category && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${GAME_TAG_COLORS[category]}`}>{category}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-0.5"><Heart className="h-3 w-3" /> {formatCount(post.like_count || 0)}</span>
          <span className="inline-flex items-center gap-0.5"><Eye className="h-3 w-3" /> {formatCount(post.view_count || 0)}</span>
          {post.created_at && <span className="inline-flex items-center gap-0.5"><Clock className="h-3 w-3" /> {formatDate(post.created_at)}</span>}
        </div>
      </div>
    </Link>
  );
}
