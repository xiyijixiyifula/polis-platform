'use client';

import Link from 'next/link';
import { Heart, MessageCircle, Eye, Pin, EyeOff } from 'lucide-react';
import { formatDate, formatCount } from '@/lib/utils';
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
    visibility?: string;
  };
  canPin?: boolean;
  onTogglePin?: () => void;
  canHide?: boolean;
  onToggleHide?: () => void;
}

export function PostCard({ post, canPin, onTogglePin, canHide, onToggleHide }: PostCardProps) {
  const excerpt = post.body ? post.body.replace(/<[^>]+>/g, '').slice(0, 200) : '';
  const spaceLink = post.space_ns || post.space_id || '';
  const author = post.author;
  const authorName = author?.display_name || author?.username || '匿名';
  const authorUsername = author?.username || '';

  return (
    <Link href={`/post/${post.id}${spaceLink ? `?space=${encodeURIComponent(spaceLink)}` : ''}`} className="relative group card block transition-all hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600">
      {post.is_pinned && (
        <div className="mb-2 text-xs text-primary-600 dark:text-primary-400 font-medium">📌 置顶</div>
      )}

      {/* Visibility badge */}
      {post.visibility && post.visibility !== 'public' && (
        <div className="mb-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            post.visibility === 'private'
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
          }`}>
            {post.visibility === 'private' ? '🔒 私密' : '🔗 不公开'}
          </span>
        </div>
      )}

      {/* Pin toggle button */}
      {canPin && onTogglePin && (
        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(); }}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full
              hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
              text-gray-400 hover:text-amber-500"
            title={post.is_pinned ? '取消置顶' : '置顶'}
          >
            <Pin className={`h-3.5 w-3.5 ${post.is_pinned ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span>{post.is_pinned ? '已置顶' : '置顶'}</span>
          </button>
        </div>
      )}

      {/* Hide toggle button (space owner: index management) */}
      {canHide && onToggleHide && (
        <div className={`absolute top-3 right-3 z-10 ${canPin && onTogglePin ? 'right-20' : ''}`}>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleHide(); }}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full
              hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
              text-gray-400 hover:text-red-500"
            title="隐藏帖子（移除空间索引）"
          >
            <EyeOff className="h-3.5 w-3.5" />
            <span>隐藏</span>
          </button>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Vote column */}
        <div className="shrink-0 pt-0.5">
          <VoteButton targetType="post" targetId={post.id} />
        </div>

        <Link href={authorUsername ? `/profile/${authorUsername}` : '#'} className="shrink-0">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium text-sm">
            {authorName.charAt(0)}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <Link href={authorUsername ? `/profile/${authorUsername}` : '#'} className="font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
              {authorName}
            </Link>
            <span>·</span>
            <span>{formatDate(post.created_at)}</span>
            {(post.space_name || post.space_ns) && (
              <>
                <span>·</span>
                <Link href={`/space/${spaceLink}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                  {post.space_name || spaceLink}
                </Link>
              </>
            )}
          </div>

          <Link href={`/post/${post.id}${spaceLink ? `?space=${encodeURIComponent(spaceLink)}` : ''}`}>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
              {post.title}
            </h2>
          </Link>

          {excerpt && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{excerpt}</p>
          )}

          {post.tags && post.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
            <button className="flex items-center gap-1 hover:text-red-500 dark:hover:text-red-400 transition-colors">
              <Heart className="h-3.5 w-3.5" />
              <span>{formatCount(post.like_count || 0)}</span>
            </button>
            <Link href={`/post/${post.id}${spaceLink ? `?space=${encodeURIComponent(spaceLink)}` : ''}`} className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{formatCount(post.comment_count || 0)}</span>
            </Link>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              <span>{formatCount(post.view_count || 0)}</span>
            </span>
            <div className="ml-auto flex items-center gap-1">
              <ShareButton url={`/post/${post.id}${spaceLink ? `?space=${encodeURIComponent(spaceLink)}` : ''}`} title={post.title} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
