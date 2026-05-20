'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Filter } from 'lucide-react';
import CreationCard, { type CreationPublic } from '@/components/CreationCard';
import SubmitDialog from '@/components/SubmitDialog';

export default function MyCreationsPage() {
  const [creations, setCreations] = useState<CreationPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState('all');

  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [activeCreationId, setActiveCreationId] = useState<string>('');

  useEffect(() => { loadCreations(true); }, [filter]);

  const loadCreations = async (reset = false) => {
    try {
      setLoading(true);
      const p = reset ? 1 : page;
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('page_size', '20');
      if (filter !== 'all') params.set('status', filter);

      const token = localStorage.getItem('polis_access_token');
      const res = await fetch(`/api/creations?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();

      if (data.data) {
        const items = Array.isArray(data.data) ? data.data : [];
        if (reset) {
          setCreations(items);
          setPage(2);
        } else {
          setCreations((prev) => [...prev, ...items]);
          setPage((prev) => prev + 1);
        }
        setHasMore(items.length === 20);
      }
    } catch { /* 静默失败 */ } finally { setLoading(false); }
  };

  const handleEdit = (id: string) => {
    window.location.href = `/creations/${id}/edit`;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个创作吗？所有社区中的引用也会被移除。')) return;
    try {
      const token = localStorage.getItem('polis_access_token');
      const res = await fetch(`/api/creations/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.code === 0) {
        setCreations((prev) => prev.filter((c) => c.id !== id));
      } else {
        alert(data.message || '删除失败');
      }
    } catch { alert('网络错误'); }
  };

  const handleSubmit = (id: string) => {
    setActiveCreationId(id);
    setSubmitDialogOpen(true);
  };

  const handleSubmitSuccess = () => {
    loadCreations(true);
  };

  const handleWithdraw = async (refId: string) => {
    if (!confirm('确定要撤稿吗？该社区将不再展示此内容。')) return;
    try {
      const token = localStorage.getItem('polis_access_token');
      const res = await fetch(`/api/refs/${refId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.code === 0) {
        loadCreations(true);
      } else {
        alert(data.message || '撤稿失败');
      }
    } catch { alert('网络错误'); }
  };

  const handleLike = async (id: string) => {
    try {
      const token = localStorage.getItem('polis_access_token');
      await fetch(`/api/creations/${id}/like`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch { /* 静默 */ }
  };

  const handleBookmark = async (id: string) => {
    try {
      const token = localStorage.getItem('polis_access_token');
      await fetch(`/api/creations/${id}/bookmark`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch { /* 静默 */ }
  };

  const handleVisibilityChange = async (id: string, newVis: string) => {
    try {
      const token = localStorage.getItem('polis_access_token');
      const res = await fetch(`/api/creations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ visibility: newVis }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setCreations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, visibility: newVis } : c))
        );
      }
    } catch { /* 静默 */ }
  };

  const filters = [
    { value: 'all', label: '全部' },
    { value: 'published', label: '已发布' },
    { value: 'draft', label: '草稿' },
    { value: 'archived', label: '归档' },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">我的创作</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                         text-sm rounded-lg px-3 py-2 pr-8 text-gray-700 dark:text-gray-300
                         focus:outline-none focus:ring-2 focus:ring-primary-500">
              {filters.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <Filter size={14}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <Link href="/creations/new"
            className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white text-sm font-medium
                       rounded-lg hover:bg-primary-700 transition">
            <Plus size={16} /> 新建创作
          </Link>
        </div>
      </div>

      {/* 加载状态 */}
      {loading && creations.length === 0 && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {creations.length === 0 && !loading && (
        <div className="glass-card py-16 text-center text-gray-400 dark:text-gray-500">
          <Plus className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg mb-2">还没有创作内容</p>
          <p className="text-sm mb-6">创建你的第一篇内容，可以投稿到任意社区</p>
          <Link href="/creations/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
            <Plus size={18} /> 开始创作
          </Link>
        </div>
      )}

      {/* 创作列表 */}
      {creations.length > 0 && (
        <div className="space-y-4">
          {creations.map((creation) => (
            <CreationCard key={creation.id}
              creation={creation}
              showSource={true}
              isOwner={true}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSubmit={handleSubmit}
              onLike={handleLike}
              onBookmark={handleBookmark}
              onWithdraw={handleWithdraw}
              onVisibilityChange={handleVisibilityChange}
            />
          ))}

          {/* 加载更多 */}
          {hasMore && (
            <div className="text-center pt-4">
              <button onClick={() => loadCreations(false)}
                disabled={loading}
                className="px-6 py-2 text-sm text-primary-600 border border-primary-200
                           rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20
                           disabled:opacity-50 transition">
                {loading ? '加载中...' : '加载更多'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 投稿弹窗 */}
      {submitDialogOpen && (
        <SubmitDialog
          creationId={activeCreationId}
          onClose={() => setSubmitDialogOpen(false)}
          onSubmit={handleSubmitSuccess}
        />
      )}
    </div>
  );
}
