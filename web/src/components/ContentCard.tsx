'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Heart, MessageCircle, Bookmark, Eye, Repeat2,
  Pencil, Trash2, Send, ChevronDown, ChevronUp, Play,
  UserPlus, UserCheck, MessageSquare, Globe, Lock, Key
} from 'lucide-react';
import { formatDate, formatCount, stripMarkdown } from '@/lib/utils';

// ========== Types ==========

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
  community_member_count?: number;
  community_post_count?: number;
  community_level?: number;
  community_xp?: number;
  community_like_count?: number;
  community_comment_count?: number;
}

export interface ContentCardCreator {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

export interface CreationPublic {
  id: string;
  creator: ContentCardCreator;
  content_type: string;
  title: string;
  body: string;
  cover_url?: string;
  media_urls?: string[];
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

export interface ContentCardProps {
  /** Core identity */
  id: string;
  title: string;
  body?: string;
  preview?: string;

  /** Breadcrumb: @spaceOwner / spaceName / moduleName */
  spaceOwner?: string;
  spaceName?: string;
  spaceNs?: string;
  moduleType?: string;
  /** 内容类型: post/video/poll/announcement 等 */
  contentType?: string;

  /** Author info */
  authorUsername?: string;
  authorDisplayName?: string;
  authorAvatar?: string;
  isOwner?: boolean;

  /** Content metadata */
  tags?: string[];
  coverUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  visibility?: string;
  hasPassword?: boolean;

  /** Stats */
  likeCount?: number;
  commentCount?: number;
  bookmarkCount?: number;
  shareCount?: number;
  viewCount?: number;
  createdAt?: string;

  /** Interactive states */
  isLiked?: boolean;
  isBookmarked?: boolean;
  isFollowing?: boolean;

  /** Links (auto-built if not provided) */
  itemLink?: string;
  spaceLink?: string;
  profileLink?: string;

  /** View mode */
  variant?: 'feed' | 'compact';

  /** Author social actions (non-owner view) */
  followerCount?: number;
  authorId?: string;
  showFollowButton?: boolean;
  showMessageButton?: boolean;
  onFollow?: (authorId: string) => void;
  onMessage?: (authorId: string) => void;
  onVisibilityChange?: (id: string, newVis: string) => void;

  /** Owner actions */
  showOwnerActions?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSubmit?: (id: string) => void;
  onLike?: (id: string) => void;
  onBookmark?: (id: string) => void;
  onWithdraw?: (refId: string) => void;

  /** Submissions panel (owner view) */
  submissions?: SubmissionInfo[];
  showSubmissionsPanel?: boolean;
}

// ========== Module Labels ==========

const MODULE_LABELS: Record<string, string> = {
  forum: '交流', article: '文章', share: '分享', wiki: '知识库',
  series: '系列', membership: '会员', video: '视频',
  code_repo: '代码仓库', qa: '问答', polls: '投票',
  announcements: '公告', chat: '聊天', store: '商城',
  course: '课程', novel: '小说', game: '游戏',
  mini_app: '小程序', members: '成员', post: '帖子',
  poll: '投票', announcement: '公告',
  discussion: '讨论', activity: '活动',
  knowledge: '知识库', resource: '资源',
};

export function getModuleLabel(moduleType?: string): string {
  if (!moduleType) return '交流';
  // 非标准内容类型统一归入交流模块
  const validModules = ['forum', 'article', 'share', 'wiki', 'video', 'qa', 'polls', 'series', 'chat', 'course', 'novel', 'game', 'mini_app'];
  if (!validModules.includes(moduleType)) return '交流';
  return MODULE_LABELS[moduleType] || moduleType;
}

export function getModuleLabelByContentType(type?: string, moduleType?: string): string {
  if (type === 'poll') return '投票';
  if (type === 'announcement') return '公告';
  if (type === 'video') return '视频';
  // 图文、图片等非标准 content_type 统一按 forum 显示为交流
  if (type === 'text' || type === 'image') return '交流';
  return getModuleLabel(moduleType);
}

function getTypeEmoji(type?: string): string {
  if (type === 'poll') return '📊';
  if (type === 'announcement') return '📢';
  if (type === 'video') return '🎬';
  return '📝';
}

// ========== ContentCard Component ==========

export default function ContentCard({
  id,
  title,
  body,
  preview,
  spaceOwner,
  spaceName,
  spaceNs,
  moduleType,
  contentType,
  authorUsername,
  authorDisplayName,
  authorAvatar,
  isOwner = false,
  tags = [],
  coverUrl,
  thumbnailUrl,
  durationSeconds,
  visibility,
  likeCount = 0,
  commentCount = 0,
  bookmarkCount = 0,
  shareCount = 0,
  viewCount = 0,
  createdAt,
  isLiked = false,
  isBookmarked: initBookmarked = false,
  isFollowing: initFollowing = false,
  itemLink,
  spaceLink,
  profileLink,
  variant = 'feed',
  followerCount,
  authorId,
  showFollowButton = false,
  showMessageButton = false,
  onFollow,
  onMessage,
  onVisibilityChange,
  showOwnerActions = false,
  onEdit,
  onDelete,
  onSubmit,
  onLike,
  onBookmark,
  onWithdraw,
  submissions,
  showSubmissionsPanel = false,
}: ContentCardProps) {
  const [liked, setLiked] = useState(isLiked);
  const [bookmarked, setBookmarked] = useState(initBookmarked);
  const [following, setFollowing] = useState(initFollowing);
  const [likes, setLikes] = useState(likeCount);
  const [expandedSubs, setExpandedSubs] = useState(false);

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newVal = !liked;
    setLiked(newVal);
    setLikes(prev => newVal ? prev + 1 : prev - 1);
    onLike?.(id);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBookmarked(!bookmarked);
    onBookmark?.(id);
  };

  // Auto-build links
  const moduleLabel = getModuleLabelByContentType(contentType, moduleType);
  const typeEmoji = getTypeEmoji(contentType);

  const builtItemLink = itemLink || (() => {
    if (contentType === 'video') return `/video/${id}?space=${encodeURIComponent(spaceNs || '')}`;
    if (contentType === 'poll' && spaceNs) return `/space/${spaceNs}/polls`;
    if (contentType === 'poll') return '/explore';
    const base = `/post/${id}`;
    if (spaceNs) return `${base}?space=${encodeURIComponent(spaceNs)}`;
    return base;
  })();

  const builtSpaceLink = spaceLink || (spaceNs ? `/space/${encodeURIComponent(spaceNs)}` : '#');
  const builtProfileLink = profileLink || (spaceOwner ? `/profile/${encodeURIComponent(spaceOwner)}` : (authorUsername ? `/profile/${encodeURIComponent(authorUsername)}` : '#'));

  const displayAuthorName = authorDisplayName || authorUsername || spaceOwner || '匿名';
  const displayAuthorUsername = authorUsername || spaceOwner || '';
  const displaySpaceName = spaceName || spaceNs || '';
  const displaySpaceOwner = spaceOwner || (spaceNs ? spaceNs.split('/')[0] : '');
  const contentPreview = preview || (body ? stripMarkdown(body).substring(0, 200) + (body.length > 200 ? '...' : '') : '');

  const isVideo = contentType === 'video';
  const hasThumbnail = !!(thumbnailUrl || coverUrl);
  const thumbUrl = thumbnailUrl || coverUrl || '';

  return (
    <Link href={builtItemLink} className={`block px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors group`}>
      {/* ===== Line 1: Breadcrumb ===== */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1 flex-wrap">
        <span className="text-sm">{typeEmoji}</span>

        {/* @空间所有者 */}
        {displaySpaceOwner && (
          <>
            <span
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = builtProfileLink; }}
              className="font-semibold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer truncate max-w-[130px]"
            >
              @{displaySpaceOwner}
            </span>
            <span className="text-gray-300 dark:text-gray-600">/</span>
          </>
        )}

        {/* 社区名 */}
        {displaySpaceName && (
          <>
            <span
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = builtSpaceLink; }}
              className="text-primary-600 dark:text-primary-400 hover:underline cursor-pointer truncate max-w-[140px]"
            >
              {displaySpaceName}
            </span>
            <span className="text-gray-300 dark:text-gray-600">/</span>
          </>
        )}

        {/* 模块标签 */}
        <span
          onClick={(e) => {
            e.preventDefault(); e.stopPropagation();
            if (spaceNs) window.location.href = `/space/${encodeURIComponent(spaceNs)}`;
          }}
          className="bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5 font-medium text-gray-600 dark:text-gray-400 shrink-0 hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer"
        >
          {moduleLabel}
        </span>

        <span className="text-gray-300 dark:text-gray-600 mx-0.5">/</span>

        {/* 标题 */}
        <span className="text-gray-900 dark:text-white font-semibold truncate">
          {title || '无标题'}
        </span>
      </div>

      {/* ===== Video Thumbnail ===== */}
      {isVideo && hasThumbnail && (
        <div className="mt-2 mb-2 pl-5">
          <div className="relative rounded-xl overflow-hidden max-h-80 bg-gray-100 dark:bg-gray-800">
            <img src={thumbUrl} alt={title}
              className="w-full object-cover" style={{ maxHeight: '320px' }} />
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="h-6 w-6 text-gray-900 ml-0.5" />
              </div>
            </div>
            {durationSeconds && (
              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-xs">
                {Math.floor(durationSeconds / 60)}:{String(durationSeconds % 60).padStart(2, '0')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Content Preview ===== */}
      {contentPreview && !isVideo && (
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 pl-5">
          {contentPreview}
        </p>
      )}
      {contentPreview && isVideo && (
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mb-2 pl-5">
          {contentPreview}
        </p>
      )}

      {/* ===== Author Row ===== */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 pl-5 mb-1.5">
        {/* Avatar */}
        {authorAvatar ? (
          <img src={authorAvatar} alt={displayAuthorName}
            className="w-5 h-5 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
            {displayAuthorName.charAt(0)}
          </div>
        )}

        {/* Author name */}
        <span
          onClick={(e) => {
            e.preventDefault(); e.stopPropagation();
            if (displayAuthorUsername) window.location.href = `/profile/${encodeURIComponent(displayAuthorUsername)}`;
          }}
          className="font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:underline cursor-pointer"
        >
          {displayAuthorName}
        </span>

        {/* Follower count */}
        {followerCount !== undefined && (
          <>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className="text-[11px]">{formatCount(followerCount)} 粉丝</span>
          </>
        )}

        {/* Time */}
        {createdAt && (
          <>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className="text-[11px]">{formatDate(createdAt)}</span>
          </>
        )}

        {/* Follow button (non-owner) */}
        {showFollowButton && !isOwner && authorId && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFollowing(!following); onFollow?.(authorId); }}
            className={`ml-auto text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
              following
                ? 'border-gray-300 dark:border-gray-600 text-gray-500 hover:text-red-500'
                : 'border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20'
            }`}
          >
            {following ? <><UserCheck size={10} className="inline mr-0.5" />已关注</> : <><UserPlus size={10} className="inline mr-0.5" />关注</>}
          </button>
        )}

        {/* Message button (non-owner) */}
        {showMessageButton && !isOwner && authorId && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMessage?.(authorId); }}
            className="text-[11px] px-2 py-0.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <MessageSquare size={10} className="inline mr-0.5" />私信
          </button>
        )}

        {/* Visibility badge */}
        {visibility && visibility !== 'public' && (
          <>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              visibility === 'private'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
            }`}>
              {visibility === 'private' ? '🔒 私密' : '🔗 不公开'}
            </span>
          </>
        )}
      </div>

      {/* ===== Tags ===== */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-5 mb-2">
          {tags.map((tag) => (
            <span key={tag}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* ===== Owner Actions Bar ===== */}
      {showOwnerActions && isOwner && (
        <div className="flex items-center gap-3 pl-5 mb-2 pb-2 border-b border-gray-100 dark:border-gray-800 flex-wrap">
          {onEdit && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(id); }}
              className="text-xs flex items-center gap-1 text-gray-500 hover:text-primary-600 transition-colors"
            >
              <Pencil size={12} /> 编辑
            </button>
          )}
          {onVisibilityChange && visibility && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); const next = visibility === 'public' ? 'private' : visibility === 'private' ? 'unlisted' : 'public'; onVisibilityChange(id, next); }}
              className={`text-xs flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                visibility === 'public' ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20' :
                visibility === 'private' ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' :
                'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
              }`}
              title={`当前: ${visibility === 'public' ? '公开' : visibility === 'private' ? '私密' : '不公开'} (点击切换)`}
            >
              {visibility === 'public' ? <><Globe size={11} className="inline mr-0.5" />公开</> :
               visibility === 'private' ? <><Lock size={11} className="inline mr-0.5" />私密</> :
               <><Key size={11} className="inline mr-0.5" />不公开</>}
            </button>
          )}
          {onSubmit && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSubmit(id); }}
              className="text-xs flex items-center gap-1 text-primary-600 hover:text-primary-700 transition-colors ml-auto"
            >
              <Send size={12} /> 投稿
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(id); }}
              className="text-xs flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors"
            >
              <Trash2 size={12} /> 删除
            </button>
          )}
        </div>
      )}

      {/* ===== Submissions Panel (Owner View) ===== */}
      {showSubmissionsPanel && isOwner && submissions && submissions.length > 0 && (
        <div className="mb-3 pl-5">
          <div className="glass-panel rounded-lg p-2 bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-gray-800">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpandedSubs(!expandedSubs); }}
              className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 w-full py-0.5"
            >
              {expandedSubs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>
                投稿社区 ({submissions.length})
                {!expandedSubs && submissions.length > 1 && (
                  <span className="text-gray-400 ml-1">+{submissions.length - 1}个</span>
                )}
              </span>
              {!expandedSubs && submissions.length > 0 && (
                <span className="text-gray-400 truncate ml-auto text-[10px]">
                  @{submissions[0].space.namespace.split('/')[0]}/{submissions[0].space.title}
                </span>
              )}
            </button>

            {expandedSubs && (
              <div className="mt-2 space-y-1.5">
                {submissions.map((sub) => (
                  <div key={sub.ref_id}
                    className="text-xs py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-white/5 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/space/${encodeURIComponent(sub.space.namespace)}`; }}
                          className="text-primary-600 dark:text-primary-400 hover:underline cursor-pointer truncate font-medium"
                        >
                          @{sub.space.namespace.split('/')[0]}/{sub.space.title || sub.space.namespace}/{getModuleLabel(sub.module_type)}
                        </span>
                        {sub.is_pinned && <span className="text-amber-500 shrink-0">📌置顶</span>}
                        {sub.display_status === 'hidden' && <span className="text-red-500 shrink-0">已隐藏</span>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-gray-400">
                          <Eye size={11} className="inline mr-0.5" />{formatCount(sub.module_views)}
                        </span>
                        {onWithdraw && (
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWithdraw(sub.ref_id); }}
                            className="text-red-500 hover:text-red-700"
                          >
                            撤稿
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Community stats row */}
                    <div className="flex items-center gap-3 mt-1 text-gray-400">
                      {sub.community_member_count !== undefined && (
                        <span>👥 {formatCount(sub.community_member_count)} 成员</span>
                      )}
                      {sub.community_post_count !== undefined && (
                        <span>📄 {formatCount(sub.community_post_count)} 帖子</span>
                      )}
                      {sub.community_level != null && (
                        <span className="text-amber-500">⭐ Lv.{sub.community_level}</span>
                      )}
                      {sub.community_like_count !== undefined && (
                        <span>❤️ {formatCount(sub.community_like_count)}</span>
                      )}
                      {sub.community_comment_count !== undefined && (
                        <span>💬 {formatCount(sub.community_comment_count)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Stats Row ===== */}
      <div className="flex items-center gap-5 pl-5 text-xs text-gray-400">
        {/* Like */}
        <button
          onClick={handleLike}
          className={`flex items-center gap-1 transition-colors ${liked ? 'text-red-500' : 'hover:text-red-500'}`}
        >
          <Heart className="h-3.5 w-3.5" fill={liked ? 'currentColor' : 'none'} />
          <span>{formatCount(likes)}</span>
        </button>

        {/* Comment */}
        <span className="flex items-center gap-1 hover:text-primary-600 transition-colors cursor-pointer">
          <MessageCircle className="h-3.5 w-3.5" />
          <span>{formatCount(commentCount)}</span>
        </span>

        {/* Bookmark */}
        <button
          onClick={handleBookmark}
          className={`flex items-center gap-1 transition-colors ${bookmarked ? 'text-yellow-500' : 'hover:text-yellow-500'}`}
        >
          <Bookmark className="h-3.5 w-3.5" fill={bookmarked ? 'currentColor' : 'none'} />
          <span>{formatCount(bookmarkCount)}</span>
        </button>

        {/* Share */}
        <span className="flex items-center gap-1 hover:text-green-500 transition-colors cursor-pointer">
          <Repeat2 className="h-3.5 w-3.5" />
          <span>{formatCount(shareCount)}</span>
        </span>

        {/* Views */}
        <span className="flex items-center gap-1 ml-auto">
          <Eye className="h-3.5 w-3.5" />
          <span>{formatCount(viewCount)}</span>
        </span>
        {createdAt && (
          <>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className="text-[11px]">{formatDate(createdAt)}</span>
          </>
        )}
      </div>
    </Link>
  );
}

// ========== Adapters ==========

/** Convert feed/bookmark/liked API item to ContentCardProps */
export function adaptFeedItem(item: any): ContentCardProps {
  const author = item.author || {};
  const space = item.space || {};
  const spaceNs = space.namespace || item.space_ns || '';
  const spaceOwner = spaceNs.split('/')[0] || author.username || '';
  const spaceName = space.title || item.space_name || spaceNs || '';
  const moduleType = item.module_type || '';

  return {
    id: item.id || item.post_id || '',
    title: item.title || '无标题',
    body: item.body || '',
    preview: item.preview || '',
    spaceOwner,
    spaceName,
    spaceNs,
    moduleType,
    contentType: item.type || 'post',
    authorUsername: author.username || '',
    authorDisplayName: author.display_name || author.username || '',
    authorAvatar: author.avatar_url || null,
    authorId: author.id || '',
    followerCount: author.follower_count || 0,
    isFollowing: item.is_following_author || author.is_following || false,
    tags: item.tags || [],
    thumbnailUrl: item.thumbnail_url || '',
    durationSeconds: item.duration_seconds || 0,
    visibility: item.visibility || '',
    likeCount: item.like_count || 0,
    commentCount: item.comment_count || 0,
    bookmarkCount: item.bookmark_count || 0,
    shareCount: item.share_count || 0,
    viewCount: item.view_count || 0,
    createdAt: item.created_at || '',
    isLiked: item.is_liked || false,
    isBookmarked: item.is_bookmarked || false,
  };
}

/** Convert creation API item to ContentCardProps */
export function adaptCreationItem(creation: any): ContentCardProps {
  const creator = creation.creator || {};
  const firstSub = creation.submissions?.[0];

  return {
    id: creation.id,
    title: creation.title || '无标题',
    body: creation.body || '',
    spaceOwner: firstSub?.space?.namespace?.split('/')[0] || creator.username || '',
    spaceName: firstSub?.space?.title || '',
    spaceNs: firstSub?.space?.namespace || '',
    moduleType: firstSub?.module_type || creation.content_type || '',
    contentType: creation.content_type || 'post',
    authorUsername: creator.username || '',
    authorDisplayName: creator.display_name || creator.username || '',
    authorAvatar: creator.avatar_url || null,
    authorId: creator.id || '',
    followerCount: creator.follower_count || 0,
    isFollowing: creation.is_following_creator || creator.is_following || false,
    tags: creation.tags || [],
    coverUrl: creation.cover_url || '',
    visibility: creation.visibility || '',
    hasPassword: creation.has_password || false,
    likeCount: creation.like_count || 0,
    commentCount: creation.comment_count || 0,
    bookmarkCount: creation.bookmark_count || 0,
    shareCount: creation.share_count || 0,
    viewCount: creation.view_count || 0,
    createdAt: creation.created_at || '',
    isLiked: creation.is_liked || false,
    isBookmarked: creation.is_bookmarked || false,
    submissions: creation.submissions || [],
  };
}
