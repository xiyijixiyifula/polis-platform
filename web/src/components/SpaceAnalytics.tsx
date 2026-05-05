'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, FileText, Eye, Heart, MessageCircle, Vote, BookOpen, TrendingUp } from 'lucide-react';
import { formatCount } from '@/lib/utils';

interface AnalyticsData {
  space_id: string;
  total_posts: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  poll_count: number;
  series_count: number;
  top_viewed_posts: TopPost[];
  top_liked_posts: TopPost[];
}

interface TopPost {
  id: string;
  title: string;
  view_count: number;
  like_count: number;
}

interface SpaceAnalyticsProps {
  namespace: string;
  spaceTitle?: string;
}

export function SpaceAnalytics({ namespace, spaceTitle }: SpaceAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!namespace) return;
    setLoading(true);
    setError(null);
    fetch(`/api/spaces/${namespace}/analytics`)
      .then(r => r.json())
      .then(res => {
        if (res.code === 0) {
          setData(res.data);
        } else {
          setError(res.message || '加载失败');
        }
      })
      .catch(() => setError('网络错误'))
      .finally(() => setLoading(false));
  }, [namespace]);

  if (loading) {
    return (
      <div className="card py-8 text-center text-gray-400 animate-pulse">
        加载数据分析...
      </div>
    );
  }

  if (error) {
    return (
      <div className="card py-8 text-center text-gray-400">
        <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    { label: '帖子', value: data.total_posts, icon: FileText, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: '浏览', value: data.total_views, icon: Eye, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: '点赞', value: data.total_likes, icon: Heart, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: '评论', value: data.total_comments, icon: MessageCircle, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: '投票', value: data.poll_count, icon: Vote, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: '系列', value: data.series_count, icon: BookOpen, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  ];

  return (
    <div className="space-y-5">
      {/* Stats Grid */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-primary-500" />
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {spaceTitle ? `${spaceTitle} 数据概览` : '数据概览'}
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`rounded-xl ${stat.bg} p-3`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{stat.label}</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCount(stat.value)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Viewed Posts */}
      {data.top_viewed_posts && data.top_viewed_posts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">热门内容 (浏览)</h3>
          </div>
          <div className="space-y-1.5">
            {data.top_viewed_posts.map((post, i) => (
              <Link
                key={post.id}
                href={`/post/${post.id}?space=${encodeURIComponent(namespace)}`}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group"
              >
                <span className={`text-xs font-bold w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                  i === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                  i === 1 ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' :
                  i === 2 ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' :
                  'text-gray-400 dark:text-gray-600'
                }`}>
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {post.title || '无标题'}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 shrink-0">
                  <Eye className="h-3 w-3" />
                  {formatCount(post.view_count)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Top Liked Posts */}
      {data.top_liked_posts && data.top_liked_posts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">热门内容 (点赞)</h3>
          </div>
          <div className="space-y-1.5">
            {data.top_liked_posts.map((post, i) => (
              <Link
                key={post.id}
                href={`/post/${post.id}?space=${encodeURIComponent(namespace)}`}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group"
              >
                <span className={`text-xs font-bold w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                  i === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                  i === 1 ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' :
                  i === 2 ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' :
                  'text-gray-400 dark:text-gray-600'
                }`}>
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {post.title || '无标题'}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 shrink-0">
                  <Heart className="h-3 w-3" />
                  {formatCount(post.like_count)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state — show when no posts have analytics */}
      {data.total_posts === 0 && (
        <div className="card py-6 text-center text-gray-400 dark:text-gray-500">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">暂无数据</p>
          <p className="text-xs mt-1">发布内容后开始显示数据统计</p>
        </div>
      )}
    </div>
  );
}

/** Compact sidebar version — quick summary for space owners */
export function SpaceAnalyticsMini({ namespace }: { namespace: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!namespace) return;
    setLoading(true);
    fetch(`/api/spaces/${namespace}/analytics`)
      .then(r => r.json())
      .then(res => {
        if (res.code === 0) setData(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [namespace]);

  if (loading || !data) return null;

  const miniStats = [
    { label: '帖子', value: data.total_posts, icon: FileText },
    { label: '浏览', value: data.total_views, icon: Eye },
    { label: '点赞', value: data.total_likes, icon: Heart },
  ];

  return (
    <div className="card">
      <div className="flex items-center gap-1.5 mb-3">
        <BarChart3 className="h-3.5 w-3.5 text-primary-500" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">数据速览</h3>
      </div>
      <div className="space-y-2">
        {miniStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Icon className="h-3 w-3" />
                {stat.label}
              </span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCount(stat.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
