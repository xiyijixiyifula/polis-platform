'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PostCard } from '@/components/PostCard';
import { BookOpen, ArrowLeft, FileText, Users, Calendar } from 'lucide-react';
import type { Series, Post } from '@/lib/api';

export default function SeriesDetailPage() {
  const params = useParams();
  const seriesId = params.id as string;

  const [series, setSeries] = useState<Series | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spaceTitle, setSpaceTitle] = useState<string>('');

  useEffect(() => {
    if (!seriesId) return;
    setLoading(true);
    setError(null);

    fetch(`/api/series/${seriesId}`)
      .then(r => r.json())
      .then(data => {
        if (data.code === 0) {
          setSeries(data.data.series);
          setPosts(data.data.posts || []);

          // Try to get space title
          if (data.data.series?.space_id) {
            fetch(`/api/spaces/${data.data.series.space_id}`)
              .then(r => r.json())
              .then(sd => {
                if (sd.code === 0 && sd.data?.title) {
                  setSpaceTitle(sd.data.title);
                }
              })
              .catch(() => {});
          }
        } else {
          setError(data.message || '系列不存在');
        }
      })
      .catch(() => setError('网络错误，请稍后重试'))
      .finally(() => setLoading(false));
  }, [seriesId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center text-gray-400 dark:text-gray-500 animate-pulse">
        加载系列...
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="text-5xl mb-4">📚</div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {error || '系列不存在'}
        </h2>
        <Link href="/explore" className="btn-primary mt-4 inline-block px-6 py-2">
          返回探索
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Back navigation */}
      <Link
        href="/explore"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        返回
      </Link>

      {/* Series Header */}
      <div className="card mb-6">
        <div className="flex items-start gap-4">
          {/* Cover */}
          <div className="h-20 w-20 shrink-0 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white">
            {series.cover_url ? (
              <img src={series.cover_url} alt="" className="h-full w-full rounded-xl object-cover" />
            ) : (
              <BookOpen className="h-10 w-10" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {series.title}
            </h1>
            {series.description && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {series.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {series.post_count || posts.length} 篇文章
              </span>
              {series.author && (
                <Link
                  href={`/profile/${series.author.username}`}
                  className="flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline"
                >
                  <Users className="h-3.5 w-3.5" />
                  @{series.author.username}
                </Link>
              )}
              {spaceTitle && (
                <span className="flex items-center gap-1">
                  来自 {spaceTitle}
                </span>
              )}
              <span>
                <Calendar className="h-3.5 w-3.5 inline mr-1" />
                {new Date(series.created_at).toLocaleDateString('zh-CN')}
              </span>
              <span className="capitalize">
                {{'public':'公开','private':'私有','unlisted':'不公开'}[series.visibility] || series.visibility}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Posts in series */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            系列文章 ({posts.length})
          </h2>
        </div>

        {posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map((post, index) => (
              <div key={post.id} className="relative">
                {index < posts.length - 1 && (
                  <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                )}
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <PostCard post={{
                      id: post.id,
                      title: post.title,
                      body: post.body,
                      author: post.author,
                      space_id: post.space_id,
                      space_ns: '',
                      space_name: spaceTitle,
                      like_count: post.like_count,
                      comment_count: post.comment_count,
                      view_count: post.view_count,
                      created_at: post.created_at,
                      tags: post.tags,
                      is_pinned: post.is_pinned,
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card py-12 text-center text-gray-400 dark:text-gray-500">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>暂无文章</p>
            <p className="text-sm mt-1">此系列还没有收录文章</p>
          </div>
        )}
      </div>
    </div>
  );
}
