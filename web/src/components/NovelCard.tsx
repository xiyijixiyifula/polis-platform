'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookText, Eye, Heart, MessageCircle, Clock, User } from 'lucide-react';
import { formatCount, formatDate, stripMarkdown } from '@/lib/utils';

export interface NovelData {
  id: string;
  title: string;
  body?: string;
  author?: {
    username?: string;
    display_name?: string;
    avatar_url?: string | null;
  };
  cover_url?: string | null;
  tags?: string[];
  like_count?: number;
  comment_count?: number;
  view_count?: number;
  bookmark_count?: number;
  created_at?: string;
  updated_at?: string;
  space_ns?: string;
  space_name?: string;
  /** 小说特有字段（从扩展数据中提取） */
  novel_status?: 'serializing' | 'completed' | 'paused';
  chapter_count?: number;
  word_count?: number;
  synopsis?: string;
}

const NOVEL_CATEGORIES: Record<string, string> = {
  '玄幻': 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  '都市': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  '言情': 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  '科幻': 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  '历史': 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  '游戏': 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  '悬疑': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  '武侠': 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  '轻小说': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

function getCategoryColor(category?: string): string {
  if (!category) return NOVEL_CATEGORIES['悬疑'];
  for (const [key, color] of Object.entries(NOVEL_CATEGORIES)) {
    if (category.includes(key)) return color;
  }
  return NOVEL_CATEGORIES['悬疑'];
}

function getNovelCategory(tags?: string[]): string | undefined {
  if (!tags || tags.length === 0) return undefined;
  for (const tag of tags) {
    if (NOVEL_CATEGORIES[tag]) return tag;
  }
  return tags[0];
}

function estimateWordCount(body?: string): number {
  if (!body) return 0;
  // 简单的中文字数估算（去除 HTML 标签和标点）
  return stripMarkdown(body).replace(/[\s\n\r]/g, '').length;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  serializing: { label: '连载中', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  completed: { label: '已完结', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  paused: { label: '暂停', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
};

const COVER_GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-indigo-600',
  'from-red-500 to-rose-600',
  'from-sky-500 to-blue-600',
];

export default function NovelCard({ novel }: { novel: NovelData }) {
  const authorName = novel.author?.display_name || novel.author?.username || '匿名';
  const category = getNovelCategory(novel.tags);
  const catColor = getCategoryColor(category);
  const status = STATUS_MAP[novel.novel_status || 'serializing'] || STATUS_MAP.serializing;
  const wordCount = novel.word_count || estimateWordCount(novel.body);
  const gradient = COVER_GRADIENTS[novel.title.charCodeAt(0) % COVER_GRADIENTS.length];
  const synopsis = novel.synopsis || (novel.body ? stripMarkdown(novel.body).slice(0, 80) + '...' : '📝 暂无简介');

  const novelHref = novel.space_ns
    ? `/post/${novel.id}?space=${encodeURIComponent(novel.space_ns)}`
    : `/post/${novel.id}`;

  return (
    <Link href={novelHref} className="group block">
      <div className="glass-card rounded-2xl overflow-hidden hover:border-primary-400 dark:hover:border-primary-600 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
        {/* 封面区域 */}
        <div className="relative aspect-[3/4] bg-gray-100 dark:bg-gray-800 overflow-hidden">
          {novel.cover_url ? (
            <Image
              src={novel.cover_url}
              alt={novel.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              unoptimized
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center p-6`}>
              <div className="text-center">
                <BookText className="h-12 w-12 text-white/60 mx-auto mb-2" />
                <p className="text-white font-bold text-lg leading-tight line-clamp-3 drop-shadow-lg">
                  {novel.title}
                </p>
              </div>
            </div>
          )}

          {/* 状态标签 */}
          <div className="absolute top-2 left-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shadow-sm ${status.className}`}>
              {status.label}
            </span>
          </div>

          {/* 字数标签 */}
          {wordCount > 0 && (
            <div className="absolute top-2 right-2">
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-black/50 text-white backdrop-blur-sm">
                {wordCount >= 10000
                  ? `${(wordCount / 10000).toFixed(1)}万字`
                  : `${wordCount}字`}
              </span>
            </div>
          )}
        </div>

        {/* 信息区域 */}
        <div className="p-3 flex-1 flex flex-col">
          {/* 标题 */}
          <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1 mb-1">
            {novel.title}
          </h3>

          {/* 作者 */}
          <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mb-2">
            <User className="h-3 w-3" />
            <span className="truncate">{authorName}</span>
          </div>

          {/* 分类标签 */}
          {category && (
            <div className="mb-2">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${catColor}`}>
                {category}
              </span>
            </div>
          )}

          {/* 简介 */}
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-3 flex-1">
            {synopsis}
          </p>

          {/* 统计数据 */}
          <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-700/50">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatCount(novel.view_count || 0)}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {formatCount(novel.like_count || 0)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {formatCount(novel.comment_count || 0)}
            </span>
            {novel.chapter_count ? (
              <span className="flex items-center gap-1">
                <BookText className="h-3 w-3" />
                {novel.chapter_count}章
              </span>
            ) : null}
          </div>

          {/* 更新时间 */}
          {novel.updated_at && (
            <div className="mt-2 text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(novel.updated_at)}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/** 将 Post 数据适配为 NovelData */
export function adaptPostToNovel(post: any, spaceNs?: string, spaceName?: string): NovelData {
  return {
    id: post.id,
    title: post.title || '无标题',
    body: post.body || '',
    author: post.author || {},
    cover_url: post.cover_url || null,
    tags: post.tags || [],
    like_count: post.like_count || 0,
    comment_count: post.comment_count || 0,
    view_count: post.view_count || 0,
    bookmark_count: post.bookmark_count || 0,
    created_at: post.created_at,
    updated_at: post.updated_at,
    space_ns: spaceNs,
    space_name: spaceName,
    novel_status: post.novel_status || 'serializing',
    chapter_count: post.chapter_count || undefined,
    word_count: post.word_count || undefined,
  };
}
