'use client';

import React from 'react';
import Link from 'next/link';
import { MessageCircle, Eye, Clock, User, Tag, CheckCircle2, HelpCircle, AlertCircle } from 'lucide-react';
import { formatCount, formatDate, stripMarkdown } from '@/lib/utils';
import { buildPostLink } from '@/lib/module-config';

interface QAPost {
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
  /** 最佳答案评论ID（如果有） */
  accepted_answer_id?: string | null;
}

const QA_STATUS = {
  resolved: { label: '已解决', icon: CheckCircle2, className: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' },
  answered: { label: '有回答', icon: MessageCircle, className: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' },
  unanswered: { label: '待回答', icon: HelpCircle, className: 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800' },
};

function getQAStatus(post: QAPost): keyof typeof QA_STATUS {
  if (post.accepted_answer_id) return 'resolved';
  if ((post.comment_count || 0) > 0) return 'answered';
  return 'unanswered';
}

export function getQAPostStatus(item: any): keyof typeof QA_STATUS {
  if (item.accepted_answer_id) return 'resolved';
  if ((item.comment_count || 0) > 0) return 'answered';
  return 'unanswered';
}

export default function QACard({ post, spaceNs, spaceName }: { post: QAPost; spaceNs?: string; spaceName?: string }) {
  const status = getQAStatus(post);
  const statusInfo = QA_STATUS[status];
  const StatusIcon = statusInfo.icon;
  const authorName = post.author?.display_name || post.author?.username || '匿名';
  const preview = post.body ? stripMarkdown(post.body).substring(0, 150) + (post.body.length > 150 ? '...' : '') : '';
  const postLink = buildPostLink(post.id, spaceNs);

  return (
    <Link href={postLink} className="block">
      <div className="glass-card p-4 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 group">
        {/* 状态行 */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {/* 问题状态 */}
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.className}`}>
            <StatusIcon className="h-3 w-3" />
            {statusInfo.label}
          </span>
          {/* 投票数 */}
          {(post.like_count || 0) > 0 && (
            <span className="text-xs text-gray-400">
              {post.like_count} 票
            </span>
          )}
          {/* 置顶标记 */}
          {post.is_pinned && (
            <span className="text-xs text-amber-500 font-medium">📌 置顶</span>
          )}
        </div>

        {/* 标题 */}
        <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2 mb-2">
          {post.title}
        </h3>

        {/* 预览 */}
        {preview && (
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">
            {preview}
          </p>
        )}

        {/* 标签 */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {post.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 底部信息 */}
        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {authorName}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {formatCount(post.comment_count || 0)} 回答
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatCount(post.view_count || 0)}
            </span>
          </div>
          {post.created_at && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(post.created_at)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
