'use client';

import Link from 'next/link';
import { Heart, MessageCircle, Eye } from 'lucide-react';
import { formatDate, formatCount } from '@/lib/utils';
import { ShareButton } from './ShareButton';

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
  };
}

export function PostCard({ post }: PostCardProps) {
  const excerpt = post.body ? post.body.replace(/<[^>]+>/g, '').slice(0, 200) : '';
  const spaceLink = post.space_ns || post.space_id || '';
  const author = post.author;
  const authorName = author?.display_name || author?.username || '匿名';
  const authorUsername = author?.username || '';

  return (
    <article className="group card cursor-pointer transition-all hover:shadow-md hover:border-gray-300">
      {post.is_pinned && (
        <div className="mb-2 text-xs text-primary-600 font-medium">📌 置顶</div>
      )}

      <div className="flex items-start gap-3">
        <Link href={authorUsername ? `/profile/${authorUsername}` : '#'} className="shrink-0">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium text-sm">
            {authorName.charAt(0)}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link href={authorUsername ? `/profile/${authorUsername}` : '#'} className="font-medium text-gray-700 hover:text-primary-600">
              {authorName}
            </Link>
            <span>·</span>
            <span>{formatDate(post.created_at)}</span>
            {(post.space_name || post.space_ns) && (
              <>
                <span>·</span>
                <Link href={`/space/${spaceLink}`} className="text-primary-600 hover:underline">
                  {post.space_name || spaceLink}
                </Link>
              </>
            )}
          </div>

          <Link href={`/post/${post.id}${spaceLink ? `?space=${encodeURIComponent(spaceLink)}` : ''}`}>
            <h2 className="text-base font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">
              {post.title}
            </h2>
          </Link>

          {excerpt && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{excerpt}</p>
          )}

          {post.tags && post.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
            <button className="flex items-center gap-1 hover:text-red-500 transition-colors">
              <Heart className="h-3.5 w-3.5" />
              <span>{formatCount(post.like_count || 0)}</span>
            </button>
            <Link href={`/post/${post.id}${spaceLink ? `?space=${encodeURIComponent(spaceLink)}` : ''}`} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
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
    </article>
  );
}
