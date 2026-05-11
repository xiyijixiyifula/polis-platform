'use client';

import Link from 'next/link';
import { Heart, MessageCircle, Eye } from 'lucide-react';

/** Feed 风格卡片（用于收藏/点赞列表） */
export function FeedItem({ item }: { item: any }) {
  const author = item.author || {};
  const space = item.space || {};
  const authorUsername = author.username || '';
  const authorDisplayName = author.display_name || authorUsername || '用户';
  const spaceNs = space.namespace || '';
  const spaceName = space.title || spaceNs;

  const getItemLink = () => {
    const base = '/post/' + item.id;
    if (spaceNs) return base + '?space=' + encodeURIComponent(spaceNs);
    return base;
  };

  const likeCount = item.like_count || 0;
  const commentCount = item.comment_count || 0;
  const viewCount = item.view_count || 0;

  return (
    <Link href={getItemLink()} className="block px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1 flex-wrap">
        <span className="font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[130px]">
          @{authorUsername}
        </span>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="text-primary-600 dark:text-primary-400 truncate max-w-[140px]">
          {spaceName}
        </span>
        <span className="text-gray-300 dark:text-gray-600 mx-0.5">/</span>
        <span className="text-gray-900 dark:text-white font-semibold truncate">
          {item.title || '无标题'}
        </span>
      </div>

      {item.preview && (
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 pl-5">
          {item.preview}
        </p>
      )}

      <div className="flex items-center gap-5 pl-5 mt-1 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Heart className="h-3.5 w-3.5" />
          <span>{likeCount}</span>
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" />
          <span>{commentCount}</span>
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <Eye className="h-3.5 w-3.5" />
          <span>{viewCount}</span>
        </span>
      </div>
    </Link>
  );
}
