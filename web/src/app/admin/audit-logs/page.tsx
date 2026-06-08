'use client';

import { useEffect, useState } from 'react';
import { History, Filter, Search } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { getAdminToken } from '@/lib/api';

interface AuditLog {
  id: string;
  actor_id: string;
  actor_type: string;
  actor_username: string;
  target_type: string;
  target_id: string;
  action: string;
  old_state: string | null;
  new_state: string | null;
  reason: string | null;
  created_at: string;
}

const ACTOR_TYPE_LABELS: Record<string, string> = {
  human: '用户', agent: 'AI Agent', admin: '管理员', system: '系统',
};
const TARGET_TYPE_LABELS: Record<string, string> = {
  post: '帖子', ref: '引用', user: '用户', space: '社区', comment: '评论', report: '举报', system: '系统',
};
const ACTION_LABELS: Record<string, string> = {
  ban: '封禁', unban: '解封', hide: '隐藏', unhide: '取消隐藏',
  approve: '通过', reject: '拒绝', delete: '删除', feature: '推荐',
  unfeature: '取消推荐', resolve: '处理', dismiss: '驳回',
  batch_review: '批量审核', agent_admin_login: 'Agent登录',
  create_review_rule: '创建规则', update_review_rule: '更新规则', delete_review_rule: '删除规则',
  archive: '归档', hide_works: '隐藏作品', hide_spaces: '隐藏社区',
};

const ACTION_COLORS: Record<string, string> = {
  ban: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  unban: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  hide: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
  unhide: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  approve: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  reject: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  delete: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  resolve: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  dismiss: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
};

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actorTypeFilter, setActorTypeFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');

  useEffect(() => { fetchLogs(); }, [page, actorTypeFilter, actionFilter, targetTypeFilter]);

  const fetchLogs = async () => {
    const token = getAdminToken();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actorTypeFilter) params.set('actor_type', actorTypeFilter);
      if (actionFilter) params.set('action', actionFilter);
      if (targetTypeFilter) params.set('target_type', targetTypeFilter);
      params.set('page', String(page));
      params.set('page_size', '30');

      const res = await fetch(`/api/admin/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) {
        const all = data.data?.items || data.data || [];
        const t = data.data?.total ?? data.pagination?.total ?? all.length;
        setLogs(all);
        setTotal(t);
      }
    } catch (e) { if (process.env.NODE_ENV === 'development') console.error('[Audit Logs]', e); }
    finally { setLoading(false); }
  };

  const totalPages = Math.max(1, Math.ceil(total / 30));

  if (loading && logs.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500"><span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2 align-middle"></span>加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">操作日志</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">追踪所有管理和审核操作记录</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select value={actorTypeFilter} onChange={(e) => { setActorTypeFilter(e.target.value); setPage(1); }}
            className="input-field text-sm py-1.5">
            <option value="">全部操作者</option>
            <option value="admin">管理员</option>
            <option value="agent">AI Agent</option>
            <option value="human">用户</option>
            <option value="system">系统</option>
          </select>
        </div>
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="input-field text-sm py-1.5">
          <option value="">全部操作</option>
          <option value="ban">封禁</option>
          <option value="unban">解封</option>
          <option value="hide">隐藏</option>
          <option value="unhide">取消隐藏</option>
          <option value="approve">通过</option>
          <option value="reject">拒绝</option>
          <option value="delete">删除</option>
          <option value="resolve">处理</option>
          <option value="dismiss">驳回</option>
        </select>
        <select value={targetTypeFilter} onChange={(e) => { setTargetTypeFilter(e.target.value); setPage(1); }}
          className="input-field text-sm py-1.5">
          <option value="">全部对象</option>
          <option value="user">用户</option>
          <option value="post">帖子</option>
          <option value="space">社区</option>
          <option value="comment">评论</option>
          <option value="report">举报</option>
          <option value="ref">引用</option>
        </select>
        <span className="text-sm text-gray-500 ml-auto">共 {total} 条</span>
      </div>

      {/* Logs table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">时间</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">操作者</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">操作</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">对象</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">详情</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  📋 暂无操作日志
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const actionColor = ACTION_COLORS[log.action] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
                return (
                  <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.actor_username}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {ACTOR_TYPE_LABELS[log.actor_type] || log.actor_type}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${actionColor}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">
                        [{TARGET_TYPE_LABELS[log.target_type] || log.target_type}]
                      </span>
                      <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{log.target_id?.substring(0, 8)}...</code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                      {log.reason && <div className="truncate" title={log.reason}>{log.reason}</div>}
                      {log.old_state && log.new_state && (
                        <div className="text-xs text-gray-400">
                          <span className="line-through">{log.old_state}</span> → <span className="font-medium">{log.new_state}</span>
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
