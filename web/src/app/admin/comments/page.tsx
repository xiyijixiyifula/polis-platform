'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Trash2, Heart, AlertTriangle, Search, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toastError } from '@/stores/toastStore';

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author_username: string;
  body: string;
  parent_id: string | null;
  like_count: number;
  is_deleted: boolean;
  created_at: string;
}

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchComments(); }, [page]);

  const fetchComments = async () => {
    const token = localStorage.getItem('polis_admin_token');
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/comments?page=${page}&page_size=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) {
        const items = data.data?.items || data.data || [];
        const t = data.data?.total ?? data.pagination?.total ?? items.length;
        setComments(items);
        setTotal(t);
      }
    } catch (e) { if (process.env.NODE_ENV === 'development') console.error('[Admin Comments]', e); }
    finally { setLoading(false); }
  };

  const doDelete = async (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return;
    const token = localStorage.getItem('polis_admin_token');
    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) fetchComments();
      else toastError('删除失败: ' + data.message);
    } catch (e) { if (process.env.NODE_ENV === 'development') console.error('[Admin Comments]', e); }
  };

  const filtered = search
    ? comments.filter((c) =>
        c.author_username?.toLowerCase().includes(search.toLowerCase()) ||
        c.body?.toLowerCase().includes(search.toLowerCase())
      )
    : comments;

  const totalPages = Math.max(1, Math.ceil(total / 20));

  if (loading && comments.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500"><span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2 align-middle"></span>加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">评论管理</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">查看和管理平台所有评论</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input type="text" placeholder="搜索评论内容或作者..." className="input-field pl-10 w-72"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: '评论总数', value: total, icon: MessageSquare, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' },
          { label: '当前页', value: comments.length, icon: Eye, color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' },
          { label: '获赞最多', value: Math.max(...comments.map(c => c.like_count || 0), 0), icon: Heart, color: 'text-pink-600 bg-pink-50 dark:bg-pink-900/20 dark:text-pink-400' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${card.color}`}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <p className="text-sm">{card.label}</p>
              </div>
              <p className="text-2xl font-bold mt-1">{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Comments table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-24">作者</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">评论内容</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-16">点赞</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-20">类型</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-36">时间</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-20">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  {search ? '🔍 未找到匹配的评论' : '💬 暂无评论数据'}
                </td>
              </tr>
            ) : (
              filtered.map((comment) => (
                <tr key={comment.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center text-xs text-primary-700 dark:text-primary-300">
                        {(comment.author_username || '?')[0].toUpperCase()}
                      </div>
                      {comment.author_username || '匿名'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="max-w-md">
                      <p className="line-clamp-2" title={comment.body}>{comment.body}</p>
                      {comment.parent_id && (
                        <span className="inline-block mt-1 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                          回复
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Heart className="h-3 w-3 text-pink-400" />
                      {comment.like_count || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      comment.parent_id
                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    }`}>
                      {comment.parent_id ? '回复' : '评论'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(comment.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => doDelete(comment.id)}
                      className="text-xs px-2.5 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800/40 inline-flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
        <span>共 {total} 条记录</span>
        <div className="flex gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))}
            className="btn-secondary text-xs px-3 py-1" disabled={page <= 1}>
            上一页
          </button>
          <span className="px-3 py-1">第 {page} / {totalPages} 页</span>
          <button onClick={() => setPage(page + 1)}
            className="btn-secondary text-xs px-3 py-1" disabled={page >= totalPages}>
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
