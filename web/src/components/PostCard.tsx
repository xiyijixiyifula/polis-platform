'use client';

import Link from 'next/link';
import { Pin, EyeOff, Star } from 'lucide-react';
import ContentCard, { adaptFeedItem } from '@/components/ContentCard';
import { ShareButton } from './ShareButton';
import { VoteButton } from './VoteButton';

interface PostCardProps {
  post: {
    id: string;
    title: string;
    body: string;
    author: { username: string; display_name: string; avatar_url: string | null } | null;
    space_id: string;
    space_ns?: string;
    space_name?: string;
    like_count: number;
    comment_count: number;
    view_count: number;
    created_at: string;
    tags?: string[];
    is_pinned?: boolean;
    is_hidden?: boolean;
    visibility?: string;
    is_liked?: boolean;
    is_bookmarked?: boolean;
  };
  canPin?: boolean;
  onTogglePin?: () => void;
  canHide?: boolean;
  onToggleHide?: () => void;
  canUnhide?: boolean;
  onToggleUnhide?: () => void;
  isFeatured?: boolean;
  canFeature?: boolean;
  onToggleFeature?: () => void;
}

export function PostCard({ post, canPin, onTogglePin, canHide, onToggleHide, canUnhide, onToggleUnhide, isFeatured, canFeature, onToggleFeature }: PostCardProps) {
  // Adapt post to ContentCard format
  const cardProps = adaptFeedItem({
    ...post,
    type: 'post',
    space: { namespace: post.space_ns, title: post.space_name },
    author: post.author || {},
    module_type: 'forum',
  });

  const spaceLink = post.space_ns || post.space_id || '';

  return (
    <div className="relative group">
      {/* Pinned badge */}
      {post.is_pinned && (
        <div className="absolute top-2 left-4 z-10 text-xs text-primary-600 dark:text-primary-400 font-medium">📌 置顶</div>
      )}

      {/* Featured badge */}
      {isFeatured && (
        <div className="absolute top-2 left-4 z-10 text-xs text-amber-600 dark:text-amber-400 font-medium">⭐ 精选</div>
      )}

      {/* Hidden badge */}
      {post.is_hidden && (
        <div className="absolute top-2 left-4 z-10 text-xs text-orange-600 dark:text-orange-400 font-medium">🙈 已隐藏 — 仅空间所有者可见</div>
      )}

      <div className="flex items-start gap-3 p-4 glass-card rounded-xl">
        {/* Vote column */}
        <div className="shrink-0 pt-1">
          <VoteButton targetType="post" targetId={post.id} />
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {/* Breadcrumb: @spaceOwner/spaceName/forum / title */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1 flex-wrap">
            {post.space_ns && (
              <>
                <span className="font-semibold text-primary-600 dark:text-primary-400 hover:underline truncate max-w-[130px]">
                  @{post.space_ns.split('/')[0]}
                </span>
                <span className="text-gray-300 dark:text-gray-600">/</span>
                <Link href={`/space/${encodeURIComponent(post.space_ns)}`}
                  className="text-primary-600 dark:text-primary-400 hover:underline truncate max-w-[140px]">
                  {post.space_name || post.space_ns}
                </Link>
                <span className="text-gray-300 dark:text-gray-600">/</span>
              </>
            )}
            <span className="bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5 font-medium text-gray-600 dark:text-gray-400 shrink-0">
              交流
            </span>
            <span className="text-gray-300 dark:text-gray-600 mx-0.5">/</span>
            <span className="text-gray-900 dark:text-white font-semibold truncate">
              {post.title || '无标题'}
            </span>
          </div>

          {/* Visibility badge */}
          {post.visibility && post.visibility !== 'public' && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              post.visibility === 'private'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
            }`}>
              {post.visibility === 'private' ? '🔒 私密' : '🔗 不公开'}
            </span>
          )}

          {/* Content preview */}
          {post.body && (
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1.5">
              {post.body.replace(/<[^>]+>/g, '').slice(0, 200)}
            </p>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <Link key={tag} href={`/search?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-purple-100 dark:hover:bg-purple-900 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Stats row + management buttons */}
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
            <Link href={`/post/${post.id}${spaceLink ? '?space=' + encodeURIComponent(spaceLink) : ''}`}
              className={`flex items-center gap-1 hover:text-red-500 transition-colors ${post.is_liked ? 'text-red-500' : ''}`}>
              <span>❤️</span>
              <span>{post.like_count || 0}</span>
            </Link>

            <Link href={`/post/${post.id}${spaceLink ? '?space=' + encodeURIComponent(spaceLink) : ''}`}
              className="flex items-center gap-1 hover:text-primary-600 transition-colors">
              <span>💬</span>
              <span>{post.comment_count || 0}</span>
            </Link>

            <span className="flex items-center gap-1">
              <span>👁️</span>
              <span>{post.view_count || 0}</span>
            </span>

            {/* Management buttons */}
            <span className="text-gray-300 dark:text-gray-700 mx-0.5">|</span>

            {canPin && onTogglePin && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(); }}
                className={`flex items-center gap-1 hover:text-amber-500 transition-colors ${post.is_pinned ? 'text-amber-500' : ''}`}
                title={post.is_pinned ? '取消置顶' : '置顶'}
              >
                <Pin className={`h-3.5 w-3.5 ${post.is_pinned ? 'fill-current' : ''}`} />
                <span>{post.is_pinned ? '已置顶' : '置顶'}</span>
              </button>
            )}

            {canFeature && onToggleFeature && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFeature(); }}
                className={`flex items-center gap-1 hover:text-amber-500 transition-colors ${isFeatured ? 'text-amber-500' : ''}`}
                title={isFeatured ? '取消精选' : '设为精选'}
              >
                <Star className={`h-3.5 w-3.5 ${isFeatured ? 'fill-current' : ''}`} />
                <span>{isFeatured ? '已精选' : '精选'}</span>
              </button>
            )}

            {canUnhide && onToggleUnhide && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleUnhide(); }}
                className="flex items-center gap-1 text-orange-500 hover:text-green-500 transition-colors"
                title="取消隐藏"
              >
                <EyeOff className="h-3.5 w-3.5" />
                <span>取消隐藏</span>
              </button>
            )}

            {canHide && onToggleHide && !post.is_hidden && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleHide(); }}
                className="flex items-center gap-1 hover:text-red-500 transition-colors"
                title="隐藏"
              >
                <EyeOff className="h-3.5 w-3.5" />
                <span>隐藏</span>
              </button>
            )}

            <div className="ml-auto flex items-center gap-1">
              <ShareButton url={`/post/${post.id}${spaceLink ? '?space=' + encodeURIComponent(spaceLink) : ''}`} title={post.title} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
