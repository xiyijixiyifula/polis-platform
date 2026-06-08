'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { PenLine, FileText, Eye, Trash2, ExternalLink, Home, MessageCircle, LogIn, Send, X, Search, Plus, Check } from 'lucide-react';
import { formatDate, formatCount } from '@/lib/utils';
import { getModuleLabel, buildPostLink } from '@/lib/module-config';
import { getToken } from '@/lib/api';

interface ContentItem {
  id: string;
  title: string;
  module_type: string;
  visibility: string;
  is_pinned: boolean;
  is_deleted: boolean;
  hidden_by_owner: boolean;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  space: { namespace: string; title: string };
}

// 常用模块键 — 用于UI快速选择，实际可用模块由后端动态返回
const COMMON_MODULE_KEYS = ['forum', 'share', 'wiki', 'qa', 'novel', 'game', 'video', 'chat', 'series', 'polls'];

export default function CreateCenterPage() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = 检测中
  const [pagination, setPagination] = useState({ page: 1, page_size: 50, total: 0, total_pages: 0 });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── 一键投稿 ──
  const [submitModal, setSubmitModal] = useState<{ creationId: string; creationTitle: string } | null>(null);
  const [submitSearch, setSubmitSearch] = useState('');
  const [submitResults, setSubmitResults] = useState<any[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitModule, setSubmitModule] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { setIsLoggedIn(false); setLoading(false); return; }
    setIsLoggedIn(true);
    loadContents();
  }, []);

  const loadContents = async (page = 1) => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/my/contents?page=${page}&page_size=50`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.code === 0 && data.data) {
        setContents(data.data.items || []);
        setPagination(data.data.pagination || {});
      }
    } catch (e) { console.error('[CreateCenter] loadContents:', e); }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const token = getToken();
    if (!token || !confirm('确认删除这篇内容？')) return;
    setDeleteId(id);
    try {
      const item = contents.find(c => c.id === id);
      if (!item?.space?.namespace) { setDeleteId(null); return; }
      const res = await fetch(`/api/spaces/${item.space.namespace}/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) {
        setContents(prev => prev.map(c => c.id === id ? { ...c, is_deleted: true } : c));
      }
    } catch (e) { console.error('[CreateCenter] handleDelete:', e); }
    setDeleteId(null);
  };

  const activeContents = contents.filter(c => !c.is_deleted);

  // ── 社区搜索（一键投稿) ──
  const handleSubmitSearch = (q: string) => {
    setSubmitSearch(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim()) { setSubmitResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      setSubmitLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}&page_size=8`);
        const data = await res.json();
        if (data.code === 0 && Array.isArray(data.data)) setSubmitResults(data.data);
      } catch (e) { console.error('[CreateCenter] handleSubmitSearch:', e); }
      setSubmitLoading(false);
    }, 300);
  };

  const handleSubmitToSpace = async (creationId: string, spaceNs: string) => {
    setSubmitting(true); setSubmitError(''); setSubmitSuccess('');
    try {
      const token = getToken();
      const res = await fetch(`/api/creations/${creationId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ creation_id: creationId, space_ns: spaceNs, module_type: submitModule }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setSubmitSuccess(`已投稿到 ${spaceNs}`);
        setTimeout(() => setSubmitModal(null), 1200);
      } else {
        setSubmitError(data.message || '投稿失败');
      }
    } catch {
      setSubmitError('网络错误');
    } finally { setSubmitting(false); }
  };

  const openSubmitModal = (item: ContentItem) => {
    setSubmitModal({ creationId: item.id, creationTitle: item.title || '(无标题)' });
    setSubmitModule(item.module_type || '');
    setSubmitSearch('');
    setSubmitResults([]);
    setSubmitError('');
    setSubmitSuccess('');
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <PenLine className="h-6 w-6 text-primary-500" />
            创作中心
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            管理你的所有原创内容 — 帖子/文章
            <span className="ml-2 text-xs text-gray-400">(已发布 {activeContents.length} 篇)</span>
          </p>
        </div>
        <Link href="/creations/new" className="btn-primary inline-flex items-center gap-1.5 text-sm px-4 py-2">
          <PenLine className="h-4 w-4" /> 新建
        </Link>
      </div>

      {isLoggedIn === false ? (
        <div className="card py-16 text-center">
          <PenLine className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">登录后开始创作</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            登录 Polis 账户，即可发布文章、视频、分享知识，管理你的全部原创内容
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/login?redirect=/create-center" className="btn-primary inline-flex items-center gap-1.5 text-sm px-5 py-2">
              <LogIn className="h-4 w-4" /> 登录
            </Link>
            <Link href="/register" className="btn-secondary text-sm px-5 py-2">
              注册
            </Link>
          </div>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="card py-4 px-5 animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : activeContents.length === 0 ? (
        <div className="card py-16 text-center">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">✨ 还没有创作任何内容</p>
          <Link href="/creations/new" className="text-sm text-primary-600 hover:underline mt-2 inline-block">
            去写第一篇文章 →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {activeContents.map((item) => (
            <div key={item.id}
              className="card py-3 px-5 flex items-start gap-4 hover:border-gray-300 dark:hover:border-gray-600 transition-all group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded uppercase">
                    {getModuleLabel(item.module_type)}
                  </span>
                  {item.hidden_by_owner && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                      已隐藏
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{formatDate(item.created_at)}</span>
                </div>

                <Link href={buildPostLink(item.id, item.space?.namespace)}
                  className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-1">
                  {item.title || '(无标题)'}
                </Link>

                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                  <Link href={`/space/${item.space?.namespace || ''}`} className="flex items-center gap-1 hover:text-primary-600">
                    <Home className="h-3 w-3" /> {item.space?.title || item.space?.namespace || '?'}
                  </Link>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {formatCount(item.view_count)}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {formatCount(item.comment_count)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); openSubmitModal(item); }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20" title="投稿到社区">
                  <Send className="h-4 w-4" />
                </button>
                <Link href={`/post/${item.id}/edit`}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20" title="编辑">
                  <PenLine className="h-4 w-4" />
                </Link>
                <Link href={buildPostLink(item.id, item.space?.namespace)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700" title="查看">
                  <ExternalLink className="h-4 w-4" />
                </Link>
                <button onClick={() => handleDelete(item.id)} disabled={deleteId === item.id}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50" title="删除">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.total_pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => loadContents(p)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                p === pagination.page
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* ===== 一键投稿模态框 ===== */}
      {submitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSubmitModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">投稿到社区</h3>
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[280px]">「{submitModal.creationTitle}」</p>
              </div>
              <button onClick={() => setSubmitModal(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* 模块选择 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">投稿到哪个模块</label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_MODULE_KEYS.map(key => (
                    <button key={key} type="button" onClick={() => setSubmitModule(key)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        submitModule === key
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                      }`}>
                      {key}
                    </button>
                  ))}
                  {submitModule && !COMMON_MODULE_KEYS.includes(submitModule) && (
                    <span className="text-xs px-3 py-1.5 rounded-full border border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400">
                      {submitModule}
                    </span>
                  )}
                </div>
              </div>

              {/* 社区搜索 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">搜索目标社区</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" value={submitSearch} onChange={(e) => handleSubmitSearch(e.target.value)}
                    placeholder="输入社区名称..." autoFocus
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  {submitLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">搜索...</span>}
                </div>
              </div>

              {/* 搜索结果 */}
              {submitResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-700">
                  {submitResults.map((s: any) => (
                    <button key={s.id} type="button" onClick={() => handleSubmitToSpace(submitModal.creationId, s.namespace)}
                      disabled={submitting}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-750 flex items-center justify-between transition-colors disabled:opacity-50">
                      <div className="min-w-0">
                        <span className="font-medium text-gray-900 dark:text-white block truncate">{s.title || s.namespace}</span>
                        <span className="text-xs text-gray-400">@{s.namespace}</span>
                      </div>
                      <Plus className="h-4 w-4 text-primary-500 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              )}

              {/* 错误/成功提示 */}
              {submitError && (
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{submitError}</div>
              )}
              {submitSuccess && (
                <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2 flex items-center gap-1.5">
                  <Check className="h-4 w-4" />{submitSuccess}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
