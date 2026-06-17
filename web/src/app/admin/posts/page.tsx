'use client';

import { useEffect, useState } from 'react';
import { Search, Star, StarOff, Trash2, EyeOff, Eye, Clock } from 'lucide-react';
import { getAdminToken } from '@/lib/api';
import { formatDate, formatCount } from '@/lib/utils';
import { toastError, toastSuccess } from '@/stores/toastStore';

interface Post {
  id: string; space_id: string; module_type: string;
  author_id: string; title: string;
  is_featured: boolean; is_deleted: boolean;
  visibility?: string; hidden_until?: string;
  view_count: number; like_count: number;
  created_at: string;
}

const DURATIONS = [
  { label: '1小时', value: 1 },
  { label: '24小时', value: 24 },
  { label: '7天', value: 168 },
  { label: '30天', value: 720 },
  { label: '永久', value: 0 },
];

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showHidePicker, setShowHidePicker] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchHideDuration, setBatchHideDuration] = useState(24);

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    const token = getAdminToken();
    try {
      const res = await fetch('/api/admin/posts?page=1&page_size=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) setPosts(data.data || []);
    } catch (e) { if (process.env.NODE_ENV === 'development') console.error('[Admin Posts]', e); }
    finally { setLoading(false); }
  };

  const doAction = async (postId: string, action: string, extra?: object) => {
    const token = getAdminToken();
    const actions: Record<string, string> = {
      feature: 'feature', unfeature: 'unfeature', delete: 'delete',
      hide: 'hide', unhide: 'unhide',
      approve: 'approve', reject: 'reject',
    };
    try {
      const res = await fetch(`/api/admin/posts/${postId}/${actions[action]}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: extra ? JSON.stringify(extra) : undefined,
      });
      const data = await res.json();
      if (data.code === 0) { fetchPosts(); setShowHidePicker(null); }
      else toastError('操作失败: ' + (data.message || '未知错误'));
    } catch (e) { if (process.env.NODE_ENV === 'development') console.error('[Admin Posts]', e); }
  };

  const doBatchHide = async () => {
    if (selected.size === 0) return;
    const token = getAdminToken();
    let count = 0;
    for (const id of Array.from(selected)) {
      try {
        await fetch(`/api/admin/posts/${id}/hide`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ duration_hours: batchHideDuration || null }),
        });
        count++;
      } catch (e) { console.error('[Admin doBatchHide] Failed to hide post:', id, e); }
    }
    fetchPosts(); setSelected(new Set());
    toastSuccess(`已隐藏 ${count} 篇帖子`);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(p => p.id)));
  };

  const getVisibilityBadge = (post: Post) => {
    if (post.is_deleted) return { label: '已删除', color: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300' };
    if (post.visibility === 'hidden') {
      if (post.hidden_until) {
        const remaining = new Date(post.hidden_until).getTime() - Date.now();
        if (remaining > 0) {
          const hours = Math.ceil(remaining / 3600000);
          return { label: `隐藏中 (${hours}h)`, color: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' };
        }
      }
      return { label: '隐藏', color: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' };
    }
    if (post.visibility === 'private') return { label: '私有', color: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' };
    if (post.visibility === 'unlisted') return { label: '不公开', color: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' };
    return { label: '公开', color: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' };
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
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">已选 {selected.size} 项</span>
              <select value={batchHideDuration} onChange={(e) => setBatchHideDuration(parseInt(e.target.value))}
                className="input-field text-sm py-1 w-24">
                {DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              <button onClick={doBatchHide}
                className="text-xs px-3 py-1.5 rounded bg-orange-600 text-white hover:bg-orange-700">
                批量隐藏
              </button>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input type="text" placeholder="搜索帖子..." className="input-field pl-10 w-64"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-center px-3 py-3 w-10">
                <input type="checkbox" onChange={toggleAll} checked={selected.size === filtered.length && filtered.length > 0}
                  className="rounded border-gray-300 dark:border-gray-600" />
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">标题</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">模块</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">可见性</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">精选</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">浏览</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">点赞</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">时间</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((post) => {
              const vBadge = getVisibilityBadge(post);
              return (
                <tr key={post.id} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${post.is_deleted ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-3 text-center">
                    <input type="checkbox" checked={selected.has(post.id)} onChange={() => toggleSelect(post.id)}
                      className="rounded border-gray-300 dark:border-gray-600" />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${post.is_deleted ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                      {post.title?.slice(0, 40) || '(无标题)'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">{post.module_type}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${vBadge.color}`}>
                      {post.visibility === 'hidden' && <Clock className="h-3 w-3" />}
                      {vBadge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {post.is_featured ? (
                      <span className="text-yellow-500"><Star className="h-4 w-4 inline" /></span>
                    ) : <span className="text-gray-300 dark:text-gray-600">-</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">{formatCount(post.view_count)}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">{formatCount(post.like_count)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(post.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {showHidePicker === post.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <select className="text-xs border rounded px-1 py-0.5 dark:bg-gray-700 dark:border-gray-600"
                          onChange={(e) => {
                            const v = parseInt(e.target.value);
                            doAction(post.id, 'hide', v > 0 ? { duration_hours: v } : {});
                          }}>
                          <option value="">选择时长</option>
                          {DURATIONS.map((d) => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                        <button onClick={() => setShowHidePicker(null)}
                          className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">取消</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {!post.is_deleted && (
                          <>
                            {post.is_featured ? (
                              <button onClick={() => doAction(post.id, 'unfeature')}
                                className="text-xs px-2 py-1 rounded bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100">
                                <StarOff className="h-3 w-3 inline" /> 取消精选
                              </button>
                            ) : (
                              <button onClick={() => doAction(post.id, 'feature')}
                                className="text-xs px-2 py-1 rounded bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100">
                                <Star className="h-3 w-3 inline" /> 精选
                              </button>
                            )}
                            {post.visibility === 'hidden' ? (
                              <button onClick={() => doAction(post.id, 'unhide')}
                                className="text-xs px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100">
                                <Eye className="h-3 w-3 inline" /> 取消隐藏
                              </button>
                            ) : (
                              <button onClick={() => setShowHidePicker(post.id)}
                                className="text-xs px-2 py-1 rounded bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100">
                                <EyeOff className="h-3 w-3 inline" /> 隐藏
                              </button>
                            )}
                            <button onClick={() => doAction(post.id, 'delete')}
                              className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100">
                              <Trash2 className="h-3 w-3 inline" /> 删除
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        共 {filtered.length} 条记录
      </div>
    </div>
  );
}
