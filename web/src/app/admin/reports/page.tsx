'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Report {
  id: string;
  reporter_id: string;
  reporter_username: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

const TARGET_LABELS: Record<string, string> = {
  post: '帖子',
  comment: '评论',
  space: '社区',
  user: '用户',
};

const STATUS_LABELS: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  pending: { label: '待处理', icon: Clock, color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
  resolved: { label: '已处理', icon: CheckCircle, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  dismissed: { label: '已驳回', icon: XCircle, color: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' },
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => { fetchReports(); }, [page, statusFilter]);

  const fetchReports = async () => {
    const token = localStorage.getItem('polis_admin_token');
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?page=${page}&page_size=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) {
        const all = data.data?.items || data.data || [];
        const t = data.data?.total ?? data.pagination?.total ?? all.length;
        setReports(all);
        setTotal(t);
      }
    } catch (e) { console.error('[Admin Reports]', e); }
    finally { setLoading(false); }
  };

  const doResolve = async (reportId: string, action: 'resolve' | 'dismiss') => {
    const token = localStorage.getItem('polis_admin_token');
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.code === 0) fetchReports();
      else alert('操作失败: ' + data.message);
    } catch (e) { console.error('[Admin Reports]', e); }
  };

  const filtered = statusFilter === 'all'
    ? reports
    : reports.filter((r) => r.status === statusFilter);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  if (loading && reports.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">举报管理</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">审核处理用户举报内容</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field text-sm py-1.5"
          >
            <option value="all">全部状态</option>
            <option value="pending">待处理</option>
            <option value="resolved">已处理</option>
            <option value="dismissed">已驳回</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: '待处理', count: reports.filter(r => r.status === 'pending').length, color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400' },
          { label: '已处理', count: reports.filter(r => r.status === 'resolved').length, color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' },
          { label: '已驳回', count: reports.filter(r => r.status === 'dismissed').length, color: 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400' },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${card.color}`}>
            <p className="text-sm">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.count}</p>
          </div>
        ))}
      </div>

      {/* Reports table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">举报人</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">类型</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">原因</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">状态</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">时间</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  暂无举报记录
                </td>
              </tr>
            ) : (
              filtered.map((report) => {
                const statusInfo = STATUS_LABELS[report.status] || STATUS_LABELS.pending;
                const StatusIcon = statusInfo.icon;
                return (
                  <tr key={report.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {report.reporter_username || '匿名'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs">
                        {TARGET_LABELS[report.target_type] || report.target_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate" title={report.reason}>
                      {report.reason}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(report.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {report.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => doResolve(report.id, 'resolve')}
                              className="text-xs px-2.5 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-800/40"
                            >
                              <CheckCircle className="h-3 w-3 inline mr-1" />
                              处理
                            </button>
                            <button
                              onClick={() => doResolve(report.id, 'dismiss')}
                              className="text-xs px-2.5 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                              <XCircle className="h-3 w-3 inline mr-1" />
                              驳回
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {report.status === 'resolved' ? '已处理' : '已驳回'}
                            {report.resolved_at && <span className="block">{formatDate(report.resolved_at)}</span>}
                          </span>
                        )}
                      </div>
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
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            className="btn-secondary text-xs px-3 py-1"
            disabled={page <= 1}
          >
            上一页
          </button>
          <span className="px-3 py-1">第 {page} / {totalPages} 页</span>
          <button
            onClick={() => setPage(page + 1)}
            className="btn-secondary text-xs px-3 py-1"
            disabled={page >= totalPages}
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
