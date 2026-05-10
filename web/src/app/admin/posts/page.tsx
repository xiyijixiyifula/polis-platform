'use client';

import { useEffect, useState } from 'react';
import { Search, Star, Trash2, Eye } from 'lucide-react';
import { formatDate, formatCount } from '@/lib/utils';

interface Post {
  id: string; space_id: string; module_type: string;
  author_id: string; title: string;
  is_featured: boolean; is_deleted: boolean;
  view_count: number; like_count: number;
  created_at: string;
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    const token = localStorage.getItem('polis_admin_token');
    try {
      const res = await fetch('/api/admin/posts?page=1&page_size=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) setPosts(data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const doAction = async (postId: string, action: string) => {
    const token = localStorage.getItem('polis_admin_token');
    const actions: Record<string, string> = {
      feature: 'feature', unfeature: 'unfeature', delete: 'delete',
    };
    await fetch(`/api/admin/posts/${postId}/${actions[action]}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
    fetchPosts();
  };

  const filtered = posts.filter((p) =>
    p.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">内容管理</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">管理平台所有帖子和内容</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input type="text" placeholder="搜索帖子..." className="input-field pl-10 w-64"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">标题</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">模块</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">精选</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">浏览</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">点赞</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">时间</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((post) => (
              <tr key={post.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${post.is_deleted ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                      {post.title?.slice(0, 40) || '(无标题)'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">{post.module_type}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  {post.is_featured ? (
                    <span className="text-yellow-500">⭐</span>
                  ) : (
                    <span className="text-gray-300 dark:text-gray-600">–</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">{formatCount(post.view_count)}</td>
                <td className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">{formatCount(post.like_count)}</td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(post.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {!post.is_featured ? (
                      <button onClick={() => doAction(post.id, 'feature')}
                        className="text-xs px-2 py-1 rounded bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-800/40">
                        <Star className="h-3 w-3 inline" /> 精选
                      </button>
                    ) : (
                      <button onClick={() => doAction(post.id, 'unfeature')}
                        className="text-xs px-2 py-1 rounded bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600">
                        取消精选
                      </button>
                    )}
                    {!post.is_deleted && (
                      <button onClick={() => doAction(post.id, 'delete')}
                        className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800/40">
                        <Trash2 className="h-3 w-3 inline" /> 删除
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
