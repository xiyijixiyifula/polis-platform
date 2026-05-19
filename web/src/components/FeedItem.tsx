'use client';

import Link from 'next/link';
import { Heart, MessageCircle, Eye, Play } from 'lucide-react';

/** Feed 风格卡片（用于收藏/点赞列表） */
export function FeedItem({ item }: { item: any }) {
  const author = item.author || {};
  const space = item.space || {};
  const authorUsername = author.username || '';
  const authorDisplayName = author.display_name || authorUsername || '用户';
  const spaceNs = space.namespace || '';
  const spaceTitle = space.title || spaceNs;

  // 从 namespace 提取空间所有者（namespace 格式: owner/slug）
  const spaceOwner = spaceNs.split('/')[0] || '';

  // 模块类型中文映射
  const moduleLabel: Record<string, string> = {
    forum: '交流', article: '交流', share: '分享', wiki: '知识库',
    series: '系列', membership: '会员', video: '视频',
    code_repo: '代码仓库', qa: '问答', polls: '投票',
    announcements: '公告', chat: '聊天', store: '商城',
    course: '课程', novel: '小说', game: '游戏',
    mini_app: '小程序', members: '成员', post: '帖子',
    poll: '投票', announcement: '公告',
  };
  const moduleName = moduleLabel[item.module_type] || item.module_type || '';

  const getItemLink = () => {
    if (item.type === 'video') return `/video/${item.id}`;
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
        <span className="text-sm">{item.type === 'video' ? '🎬' : ''}</span>
        <span className="font-semibold text-primary-600 dark:text-primary-400 truncate max-w-[130px]">
          @{spaceOwner}
        </span>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="text-gray-700 dark:text-gray-300 truncate max-w-[140px]">
          {spaceTitle}
        </span>
        {moduleName && (
          <>
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <span className="text-gray-400 dark:text-gray-500 truncate max-w-[80px]">
              {moduleName}
            </span>
          </>
        )}
        <span className="text-gray-300 dark:text-gray-600 mx-0.5">/</span>
        <span className="text-gray-900 dark:text-white font-semibold truncate">
          {item.title || '无标题'}
        </span>
      </div>

      {item.type === 'video' && item.thumbnail_url && (
        <div className="mt-1 mb-2 pl-5">
          <div className="relative rounded-lg overflow-hidden max-h-48 bg-gray-100 dark:bg-gray-800">
            <img src={item.thumbnail_url} alt={item.title}
              className="w-full object-cover" style={{ maxHeight: '192px' }} />
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="h-5 w-5 text-gray-900 ml-0.5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {item.preview && item.type !== 'video' && (
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 pl-5">
          {item.preview}
        </p>
      )}
      {item.preview && item.type === 'video' && (
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mb-2 pl-5">
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
