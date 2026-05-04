'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BarChart3, ExternalLink, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface PollItem {
  id: string;
  title: string;
  description: string;
  poll_type: string;
  total_votes: number;
  created_at: string;
  space_ns: string;
  space_title: string;
}

export default function PollsPage() {
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/polls?page=${page}&page_size=${pageSize}`)
      .then(r => r.json())
      .then(data => {
        if (data.code === 0 && Array.isArray(data.data)) {
          setPolls(data.data as PollItem[]);
        } else {
          setPolls([]);
        }
      })
      .catch(() => setPolls([]))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary-600" />
            投票中心
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">浏览全平台的投票和问卷调查</p>
        </div>
        <Link href="/polls/new" className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-1.5">
          <BarChart3 className="h-4 w-4" /> 发起投票
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : polls.length > 0 ? (
        <div className="space-y-3">
          {polls.map((poll) => (
            <Link
              key={poll.id}
              href={poll.space_ns ? `/space/${poll.space_ns}/polls` : '#'}
              className="card block p-5 hover:border-primary-300 dark:hover:border-primary-600 transition-colors group"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {poll.title}
                  </h3>
                  {poll.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {poll.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <BarChart3 className="h-3.5 w-3.5" />
                      {poll.total_votes} 票
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(poll.created_at).toLocaleDateString('zh-CN')}
                    </span>
                    {poll.space_ns && (
                      <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
                        <ExternalLink className="h-3.5 w-3.5" />
                        {poll.space_title || poll.space_ns}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    {poll.total_votes}
                  </div>
                  <div className="text-xs text-gray-400">票</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card py-16 text-center">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">暂无投票</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">还没有人发起投票，成为第一个吧！</p>
          <Link href="/polls/new" className="btn-primary px-6 py-2.5 inline-flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> 发起投票
          </Link>
        </div>
      )}

      {/* Pagination */}
      {polls.length >= pageSize && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-secondary px-4 py-2 text-sm inline-flex items-center gap-1 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" /> 上一页
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">第 {page} 页</span>
          <button
            onClick={() => setPage(p => p + 1)}
            className="btn-secondary px-4 py-2 text-sm inline-flex items-center gap-1"
          >
            下一页 <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
