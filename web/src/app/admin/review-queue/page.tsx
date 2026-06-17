'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, EyeOff, Ban, Clock, AlertTriangle, Filter, ChevronDown } from 'lucide-react';
import { getAdminToken } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toastError } from '@/stores/toastStore';

interface QueueItem {
  target_type: string;
  target_id: string;
  status: string;
  title: string;
  author: string;
  created_at: string;
  extra: {
    creation_id?: string;
    space_id?: string;
    module_type?: string;
    target_type?: string;
    target_id?: string;
    reporter_id?: string;
  };
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  ref: { label: '投稿审核', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' },
  report: { label: '举报', color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' },
};

export default function AdminReviewQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending_review');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showHideModal, setShowHideModal] = useState<string | null>(null);
  const [hideDuration, setHideDuration] = useState('24');
  const [batchAction, setBatchAction] = useState('');

  useEffect(() => { fetchQueue(); }, [page, statusFilter, typeFilter]);

  const fetchQueue = async () => {
    const token = getAdminToken();
    setLoading(true);
    try {
      const status = statusFilter === 'all' ? '' : statusFilter;
      const type = typeFilter === 'all' ? '' : typeFilter === 'ref' ? 'ref' : 'report';
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (type) params.set('type', type);
      params.set('page', String(page));
      params.set('page_size', '20');

      const res = await fetch(`/api/admin/review-queue?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) {
        const all = data.data?.items || data.data || [];
        const t = data.data?.total ?? data.pagination?.total ?? all.length;
        setItems(all);
        setTotal(t);
      }
    } catch (e) { if (process.env.NODE_ENV === 'development') console.error('[Review Queue]', e); }
    finally { setLoading(false); }
  };

  const doSingleAction = async (targetType: string, targetId: string, action: string, extra?: object) => {
    const token = getAdminToken();
    try {
      let url = '';
      let body: object | undefined;
      if (action === 'approve_ref' || action === 'reject_ref') {
        url = `/api/admin/refs/${targetId}/review`;
        body = { action: action === 'approve_ref' ? 'approve' : 'reject' };
      } else if (action === 'hide_post') {
        url = `/api/admin/posts/${targetId}/hide`;
        body = { duration_hours: extra ? (extra as { duration_hours: number }).duration_hours : null };
      } else if (action === 'resolve_report') {
        url = `/api/admin/reports/${targetId}/resolve`;
        body = { action: 'resolve' };
      } else if (action === 'dismiss_report') {
        url = `/api/admin/reports/${targetId}/resolve`;
        body = { action: 'dismiss' };
      }
      if (!url) return;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.code === 0) { fetchQueue(); setShowHideModal(null); }
      else toastError('操作失败: ' + (data.message || '未知错误'));
    } catch (e) { if (process.env.NODE_ENV === 'development') console.error('[Review Queue Action]', e); }
  };

  const doBatchAction = async () => {
    if (!batchAction || selected.size === 0) return;
    const token = getAdminToken();
    const selectedItems = items.filter(i => selected.has(`${i.target_type}:${i.target_id}`));
    const batchItems = selectedItems.map(i => ({ target_type: i.target_type === 'ref' ? 'post' : i.extra?.target_type || 'post', target_id: i.target_type === 'ref' ? (i.extra?.creation_id || i.target_id) : (i.extra?.target_id || i.target_id) }));
    try {
      const res = await fetch('/api/admin/review-queue/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: batchItems, action: batchAction }),
      });
      const data = await res.json();
      if (data.code === 0) { fetchQueue(); setSelected(new Set()); setBatchAction(''); }
      else toastError('批量操作失败: ' + (data.message || '未知错误'));
    } catch (e) { if (process.env.NODE_ENV === 'development') console.error('[Batch Review]', e); }
  };

  const toggleSelect = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map(i => `${i.target_type}:${i.target_id}`)));
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  if (loading && items.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500"><span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2 align-middle"></span>加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">审查队列</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">审核待处理的投稿和举报</p>
        </div>
      </div>

      {/* Filters + Batch */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field text-sm py-1.5">
            <option value="pending_review">待审核</option>
            <option value="all">全部状态</option>
            <option value="pending">待处理</option>
            <option value="visible">已通过</option>
            <option value="rejected">已拒绝</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="input-field text-sm py-1.5">
            <option value="all">全部类型</option>
            <option value="ref">投稿审核</option>
            <option value="report">举报</option>
          </select>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500">已选 {selected.size} 项</span>
            <select value={batchAction} onChange={(e) => setBatchAction(e.target.value)}
              className="input-field text-sm py-1.5">
              <option value="">批量操作...</option>
              <option value="approve">批量通过</option>
              <option value="reject">批量拒绝</option>
              <option value="hide">批量隐藏</option>
            </select>
            <button onClick={doBatchAction} disabled={!batchAction}
              className="text-xs px-3 py-1.5 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
              执行
            </button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: '投稿待审', count: items.filter(i => i.target_type === 'ref' && i.status === 'pending_review').length, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' },
          { label: '举报待处理', count: items.filter(i => i.target_type === 'report' && i.status === 'pending').length, color: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400' },
          { label: '总计', count: items.length, color: 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400' },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${card.color}`}>
            <p className="text-sm">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.count}</p>
          </div>
        ))}
      </div>

      {/* Queue table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full min-w-[750px]">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-center px-3 py-3 w-10">
                <input type="checkbox" onChange={toggleAll} checked={selected.size === items.length && items.length > 0}
                  className="rounded border-gray-300 dark:border-gray-600" />
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">类型</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">标题/原因</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">作者/举报人</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">状态</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">时间</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  ✅ 暂无待审查内容
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const key = `${item.target_type}:${item.target_id}`;
                const typeInfo = TYPE_LABELS[item.target_type] || TYPE_LABELS.ref;
                const isRef = item.target_type === 'ref';
                return (
                  <tr key={key} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-3 py-3 text-center">
                      <input type="checkbox" checked={selected.has(key)} onChange={() => toggleSelect(key)}
                        className="rounded border-gray-300 dark:border-gray-600" />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 max-w-xs truncate" title={item.title}>
                      {item.title}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.author}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                        item.status === 'pending_review' || item.status === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        <Clock className="h-3 w-3" />
                        {item.status === 'pending_review' ? '待审核' : item.status === 'pending' ? '待处理' : item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(item.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {showHideModal === key ? (
                        <div className="flex items-center justify-end gap-1">
                          <select value={hideDuration} onChange={(e) => setHideDuration(e.target.value)}
                            className="text-xs border rounded px-1 py-0.5 dark:bg-gray-700 dark:border-gray-600">
                            <option value="1">1小时</option>
                            <option value="24">24小时</option>
                            <option value="168">7天</option>
                            <option value="720">30天</option>
                            <option value="0">永久</option>
                          </select>
                          <button onClick={() => {
                            const targetId = isRef ? (item.extra?.creation_id || item.target_id) : (item.extra?.target_id || item.target_id);
                            doSingleAction(isRef ? 'ref' : 'report', isRef ? targetId : item.target_id,
                              isRef ? 'hide_post' : 'resolve_report',
                              isRef ? { duration_hours: parseInt(hideDuration) || null } : undefined);
                          }}
                            className="text-xs px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300">
                            确认
                          </button>
                          <button onClick={() => setShowHideModal(null)}
                            className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">取消</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {isRef ? (
                            <>
                              <button onClick={() => doSingleAction('ref', item.target_id, 'approve_ref')}
                                className="text-xs px-2.5 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-800/40">
                                <CheckCircle className="h-3 w-3 inline mr-1" />通过
                              </button>
                              <button onClick={() => doSingleAction('ref', item.target_id, 'reject_ref')}
                                className="text-xs px-2.5 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800/40">
                                <XCircle className="h-3 w-3 inline mr-1" />拒绝
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => doSingleAction('report', item.target_id, 'resolve_report')}
                                className="text-xs px-2.5 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-800/40">
                                <CheckCircle className="h-3 w-3 inline mr-1" />处理
                              </button>
                              <button onClick={() => doSingleAction('report', item.target_id, 'dismiss_report')}
                                className="text-xs px-2.5 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600">
                                <XCircle className="h-3 w-3 inline mr-1" />驳回
                              </button>
                            </>
                          )}
                          <button onClick={() => setShowHideModal(key)}
                            className="text-xs px-2.5 py-1 rounded bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-800/40">
                            <EyeOff className="h-3 w-3 inline" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
        <span>共 {total} 条记录</span>
        <div className="flex gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} className="btn-secondary text-xs px-3 py-1" disabled={page <= 1}>上一页</button>
          <span className="px-3 py-1">第 {page} / {totalPages} 页</span>
          <button onClick={() => setPage(page + 1)} className="btn-secondary text-xs px-3 py-1" disabled={page >= totalPages}>下一页</button>
        </div>
      </div>
    </div>
  );
}
