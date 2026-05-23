'use client';

import { useEffect, useState } from 'react';
import { Search, Shield, Ban, CheckCircle, XCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface User {
  id: string; username: string; display_name: string;
  email: string; verified: boolean; bio: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { fetchUsers(); }, [page]);

  const fetchUsers = async () => {
    const token = localStorage.getItem('polis_admin_token');
    try {
      const res = await fetch(`/api/admin/users?page=${page}&page_size=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) setUsers(data.data || []);
    } catch (e) { console.error('[Admin Users]', e); }
    finally { setLoading(false); }
  };

  const doAction = async (userId: string, action: string, body?: object) => {
    const token = localStorage.getItem('polis_admin_token');
    const endpoints: Record<string, string> = {
      ban: `/api/admin/users/${userId}/ban`,
      unban: `/api/admin/users/${userId}/unban`,
      verify: `/api/admin/users/${userId}/verify`,
    };
    try {
      await fetch(endpoints[action], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      fetchUsers();
    } catch (e) { console.error('[Admin Users]', e); }
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

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">用户名</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">显示名称</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">邮箱</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">认证</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">注册时间</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{user.username}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{user.display_name}</td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                <td className="px-4 py-3 text-center">
                  {user.verified ? (
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
                  <div className="flex items-center justify-end gap-1">
                    {!user.verified ? (
                      <button onClick={() => doAction(user.id, 'verify', { verify_type: 'personal' })}
                        className="text-xs px-2.5 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-800/40">
                        认证
                      </button>
                    ) : (
                      <button onClick={() => doAction(user.id, 'ban', { reason: '违规操作' })}
                        className="text-xs px-2.5 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800/40">
                        <Ban className="h-3 w-3 inline" /> 封禁
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
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
