'use client';

import { useEffect, useState } from 'react';
import { Search, Shield, Ban, CheckCircle, XCircle, EyeOff, Building2, UserCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface User {
  id: string; username: string; display_name: string;
  email: string; verified: boolean; bio: string;
  banned?: boolean; banned_at?: string; ban_reason?: string;
  created_at: string;
}

const DURATIONS = [
  { label: '1小时', value: 1 },
  { label: '24小时', value: 24 },
  { label: '7天', value: 168 },
  { label: '30天', value: 720 },
  { label: '永久', value: 0 },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showConfirm, setShowConfirm] = useState<{ userId: string; action: string; label: string } | null>(null);
  const [showDuration, setShowDuration] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');

  useEffect(() => { fetchUsers(); }, [page]);

  const fetchUsers = async () => {
    const token = localStorage.getItem('polis_admin_token');
    try {
      const res = await fetch(`/api/admin/users?page=${page}&page_size=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) setUsers(data.data || []);
    } catch (e) { if (process.env.NODE_ENV === 'development') console.error('[Admin Users]', e); }
    finally { setLoading(false); }
  };

  const doAction = async (userId: string, action: string, body?: object) => {
    const token = localStorage.getItem('polis_admin_token');
    const endpoints: Record<string, string> = {
      ban: `/api/admin/users/${userId}/ban`,
      unban: `/api/admin/users/${userId}/unban`,
      verify: `/api/admin/users/${userId}/verify`,
      'hide-works': `/api/admin/users/${userId}/hide-works`,
      'hide-spaces': `/api/admin/users/${userId}/hide-spaces`,
    };
    try {
      const res = await fetch(endpoints[action], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (data.code === 0) { fetchUsers(); setShowConfirm(null); setShowDuration(null); }
      else alert('操作失败: ' + (data.message || '未知错误'));
    } catch (e) { if (process.env.NODE_ENV === 'development') console.error('[Admin Users]', e); }
  };

  const confirmAction = (userId: string, action: string, label: string) => {
    setShowConfirm({ userId, action, label });
  };

  const filtered = users.filter((u) =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">用户管理</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">管理所有平台用户</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input type="text" placeholder="搜索用户..." className="input-field pl-10 w-64"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowConfirm(null); setBanReason(''); }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">确认操作</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{showConfirm.label}</p>
            {showConfirm.action === 'ban' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">封禁原因</label>
                <textarea className="input-field w-full" rows={2} placeholder="输入封禁原因..." value={banReason}
                  onChange={(e) => setBanReason(e.target.value)} />
              </div>
            )}
            {showConfirm.action === 'hide-works' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">隐藏时长</label>
                <select className="input-field w-full" onChange={(e) => {
                  const dur = parseInt(e.target.value);
                  setShowConfirm({ ...showConfirm, action: `hide-works:${dur}` });
                }}>
                  {DURATIONS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowConfirm(null); setBanReason(''); }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">取消</button>
              <button onClick={() => {
                if (showConfirm.action.startsWith('hide-works:')) {
                  const dur = parseInt(showConfirm.action.split(':')[1]);
                  doAction(showConfirm.userId, 'hide-works', { reason: '管理员操作', duration_hours: dur || null });
                } else if (showConfirm.action === 'ban') {
                  doAction(showConfirm.userId, 'ban', { reason: banReason || '违规行为' });
                  setBanReason('');
                } else {
                  doAction(showConfirm.userId, showConfirm.action);
                }
              }}
                className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg">确认</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">用户名</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">显示名称</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">邮箱</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">状态</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">注册时间</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => {
              const isBanned = user.banned === true;
              return (
                <tr key={user.id} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isBanned ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{user.username}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{user.display_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                  <td className="px-4 py-3 text-center">
                    {isBanned ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full" title={user.ban_reason || ''}>
                        <Ban className="h-3 w-3" /> 已封禁
                      </span>
                    ) : user.verified ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                        <CheckCircle className="h-3 w-3" /> 已认证
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                        <XCircle className="h-3 w-3" /> 未认证
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      {isBanned ? (
                        <>
                          <button onClick={() => confirmAction(user.id, 'unban', `确认解封用户 ${user.username}？`)}
                            className="text-xs px-2.5 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-800/40">
                            <UserCheck className="h-3 w-3 inline mr-1" />解封
                          </button>
                        </>
                      ) : (
                        <>
                          {!user.verified && (
                            <button onClick={() => doAction(user.id, 'verify', { verify_type: 'personal' })}
                              className="text-xs px-2.5 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-800/40">
                              认证
                            </button>
                          )}
                          <button onClick={() => confirmAction(user.id, 'ban', `确认封禁用户 ${user.username}？`)}
                            className="text-xs px-2.5 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800/40">
                            <Ban className="h-3 w-3 inline mr-1" />封禁
                          </button>
                        </>
                      )}
                      <button onClick={() => confirmAction(user.id, 'hide-works', `隐藏 ${user.username} 的所有作品？`)}
                        className="text-xs px-2.5 py-1 rounded bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-800/40">
                        <EyeOff className="h-3 w-3 inline mr-1" />隐藏作品
                      </button>
                      <button onClick={() => confirmAction(user.id, 'hide-spaces', `将 ${user.username} 的所有社区设为私有？`)}
                        className="text-xs px-2.5 py-1 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-800/40">
                        <Building2 className="h-3 w-3 inline mr-1" />隐藏社区
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
        <span>共 {users.length} 条记录</span>
        <div className="flex gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} className="btn-secondary text-xs px-3 py-1" disabled={page <= 1}>上一页</button>
          <span className="px-3 py-1">第 {page} 页</span>
          <button onClick={() => setPage(page + 1)} className="btn-secondary text-xs px-3 py-1">下一页</button>
        </div>
      </div>
    </div>
  );
}
