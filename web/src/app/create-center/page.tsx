'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PenLine, FileText, Eye, Trash2, ExternalLink, Home, MessageCircle } from 'lucide-react';
import { formatDate, formatCount } from '@/lib/utils';

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

const moduleLabels: Record<string, string> = {
  forum: '交流', share: '分享', wiki: '知识库',
  qa: '问答', polls: '投票', announcements: '公告',
  novel: '小说', game: '游戏', mini_app: '小程序',
};

function getModuleLabel(mt: string) { return moduleLabels[mt] || mt; }

export default function CreateCenterPage() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, page_size: 50, total: 0, total_pages: 0 });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadContents = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('polis_access_token');
      const res = await fetch(`/api/my/contents?page=${page}&page_size=50`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.code === 0 && data.data) {
        setContents(data.data.items || []);
        setPagination(data.data.pagination || {});
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadContents(); }, []);

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem('polis_access_token');
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
    } catch {}
    setDeleteId(null);
  };

  const activeContents = contents.filter(c => !c.is_deleted);

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

      {loading ? (
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
          <p className="text-gray-500 dark:text-gray-400">还没有创作任何内容</p>
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

                <Link href={`/post/${item.id}`}
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
                <Link href={`/post/${item.id}/edit`}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20" title="编辑">
                  <PenLine className="h-4 w-4" />
                </Link>
                <Link href={`/post/${item.id}`}
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
    </div>
  );
}
