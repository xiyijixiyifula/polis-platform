'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Bookmark, Share2, Eye, Send, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDate, formatCount } from '@/lib/utils';

export interface CreationCardCreator {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

export interface SpaceMini {
  id: string;
  namespace: string;
  title: string;
}

export interface SubmissionInfo {
  ref_id: string;
  space: SpaceMini;
  module_type: string;
  display_status: string;
  is_pinned: boolean;
  module_views: number;
  submitted_at: string;
}

export interface CreationPublic {
  id: string;
  creator: CreationCardCreator;
  content_type: string;
  title: string;
  body: string;
  cover_url?: string;
  media_urls: string[];
  visibility: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  bookmark_count: number;
  share_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  has_password: boolean;
  tags: string[];
  status: string;
  created_at: string;
  updated_at: string;
  submissions?: SubmissionInfo[];
}

interface CreationCardProps {
  creation: CreationPublic;
  showSource?: boolean;
  isOwner?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSubmit?: (id: string) => void;
  onLike?: (id: string) => void;
  onBookmark?: (id: string) => void;
  onWithdraw?: (refId: string) => void;
}

export default function CreationCard({
  creation,
  showSource = true,
  isOwner = false,
  onEdit,
  onDelete,
  onSubmit,
  onLike,
  onBookmark,
  onWithdraw,
}: CreationCardProps) {
  const [expandedSubs, setExpandedSubs] = useState(false);
  const [liked, setLiked] = useState(creation.is_liked);
  const [bookmarked, setBookmarked] = useState(creation.is_bookmarked);
  const [likeCount, setLikeCount] = useState(creation.like_count);

  const handleLike = () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((prev) => (newLiked ? prev + 1 : prev - 1));
    onLike?.(creation.id);
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    onBookmark?.(creation.id);
  };

  const firstSub = creation.submissions?.[0];

  return (
    <div className="glass-card rounded-xl p-4 hover:shadow-glow transition-all duration-300">
      {/* 来源路径 */}
      {showSource && firstSub && (
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span className="hover:text-primary-600">
            <Link href={`/profile/${creation.creator.username}`}>
              @{creation.creator.display_name || creation.creator.username}
            </Link>
          </span>
          <span>/</span>
          <span className="hover:text-primary-600">
            <Link href={`/space/${firstSub.space.namespace}`}>
              {firstSub.space.title}
            </Link>
          </span>
          <span>/</span>
          <span className="text-primary-600 font-medium">{firstSub.module_type}</span>
          {creation.submissions && creation.submissions.length > 1 && (
            <span className="text-gray-400 ml-1">+{creation.submissions.length - 1}个社区</span>
          )}
        </div>
      )}

      {/* 投稿列表（仅所有者可见） */}
      {isOwner && creation.submissions && creation.submissions.length > 0 && (
        <div className="mb-3 glass-panel rounded-lg p-2">
          <button
            onClick={() => setExpandedSubs(!expandedSubs)}
            className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 w-full"
          >
            {expandedSubs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>投稿社区 ({creation.submissions.length})</span>
            {onSubmit && (
              <span
                onClick={(e) => { e.stopPropagation(); onSubmit(creation.id); }}
                className="ml-auto text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <Send size={12} /> 投稿
              </span>
            )}
          </button>

          {expandedSubs && (
            <div className="mt-2 space-y-1">
              {creation.submissions.map((sub) => (
                <div key={sub.ref_id}
                  className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-white/10 dark:hover:bg-white/10 transition">
                  <Link href={`/space/${sub.space.namespace}`}
                    className="text-gray-600 dark:text-gray-300 hover:text-primary-600">
                    @{creation.creator.username}/{sub.space.title}/{sub.module_type}
                  </Link>
                  <div className="flex items-center gap-2">
                    {sub.is_pinned && <span className="text-amber-500">置顶</span>}
                    {sub.display_status === 'hidden' && <span className="text-red-500">已隐藏</span>}
                    {onWithdraw && (
                      <button onClick={() => onWithdraw(sub.ref_id)}
                        className="text-red-500 hover:text-red-700">
                        撤稿
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 标题 */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 hover:text-primary-600">
        <Link href={`/creations/${creation.id}`}>{creation.title}</Link>
      </h3>

      {/* 作者信息行 */}
      <div className="flex items-center gap-2 mb-2">
        {creation.creator.avatar_url ? (
          <img src={creation.creator.avatar_url} alt={creation.creator.username}
            className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold">
            {creation.creator.display_name?.[0] || creation.creator.username[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${creation.creator.username}`}
            className="text-sm font-medium text-gray-800 dark:text-gray-200 hover:text-primary-600">
            {creation.creator.display_name || creation.creator.username}
          </Link>
        </div>
      </div>

      {/* 内容摘要 */}
      <div className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-3">
        {creation.body.substring(0, 200)}
        {creation.body.length > 200 && '...'}
      </div>

      {/* 标签 */}
      {creation.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {creation.tags.map((tag) => (
            <span key={tag}
              className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 所有者操作栏 */}
      {isOwner && (
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/10 dark:border-white/10">
          <button onClick={() => onEdit?.(creation.id)}
            className="text-xs flex items-center gap-1 text-gray-500 hover:text-primary-600">
            <Pencil size={12} /> 编辑
          </button>
          <span className="text-xs text-gray-400">权限: {creation.visibility}</span>
          <button onClick={() => onDelete?.(creation.id)}
            className="text-xs flex items-center gap-1 text-red-500 hover:text-red-700 ml-auto">
            <Trash2 size={12} /> 删除
          </button>
        </div>
      )}

      {/* 互动数据栏 */}
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        <button onClick={handleLike}
          className={`flex items-center gap-1 transition ${liked ? 'text-red-500' : 'hover:text-red-500'}`}>
          <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
          <span>{formatCount(likeCount)}</span>
        </button>

        <Link href={`/creations/${creation.id}`}
          className="flex items-center gap-1 hover:text-primary-600">
          <MessageCircle size={16} />
          <span>{formatCount(creation.comment_count)}</span>
        </Link>

        <button onClick={handleBookmark}
          className={`flex items-center gap-1 transition ${bookmarked ? 'text-primary-600' : 'hover:text-primary-600'}`}>
          <Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} />
          <span>{formatCount(creation.bookmark_count)}</span>
        </button>

        <span className="flex items-center gap-1">
          <Share2 size={16} />
          <span>{formatCount(creation.share_count)}</span>
        </span>

        <span className="flex items-center gap-1">
          <Eye size={16} />
          <span>{formatCount(creation.view_count)}</span>
        </span>

        <span className="text-gray-400 ml-auto">{formatDate(creation.created_at)}</span>
      </div>
    </div>
  );
}
