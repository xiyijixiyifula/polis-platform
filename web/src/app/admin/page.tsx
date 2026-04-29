'use client';

import { useEffect, useState } from 'react';
import { Users, Building2, FileText, Activity, TrendingUp, DollarSign } from 'lucide-react';

interface Stats {
  total_users: number; total_spaces: number; total_posts: number;
  total_comments: number; total_transactions: number;
  active_users_today: number; new_users_today: number; new_posts_today: number;
  reported_content: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const token = localStorage.getItem('polis_admin_token');
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) setStats(data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const statCards = stats ? [
    { icon: Users, label: '总用户', value: stats.total_users, color: 'bg-blue-500' },
    { icon: Building2, label: '总社区', value: stats.total_spaces, color: 'bg-green-500' },
    { icon: FileText, label: '总帖子', value: stats.total_posts, color: 'bg-purple-500' },
    { icon: Activity, label: '评论', value: stats.total_comments, color: 'bg-orange-500' },
    { icon: TrendingUp, label: '今日新增用户', value: stats.new_users_today, color: 'bg-pink-500' },
    { icon: TrendingUp, label: '今日新增帖子', value: stats.new_posts_today, color: 'bg-indigo-500' },
    { icon: Users, label: '今日活跃', value: stats.active_users_today, color: 'bg-teal-500' },
    { icon: DollarSign, label: '交易笔数', value: stats.total_transactions, color: 'bg-yellow-500' },
  ] : [];

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
        <p className="text-sm text-gray-500 mt-1">平台运营数据概览</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value.toLocaleString()}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg ${card.color} flex items-center justify-center`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: '用户管理', href: '/admin/users', icon: Users, color: 'text-blue-600 bg-blue-50' },
            { label: '社区管理', href: '/admin/spaces', icon: Building2, color: 'text-green-600 bg-green-50' },
            { label: '内容审核', href: '/admin/posts', icon: FileText, color: 'text-purple-600 bg-purple-50' },
            { label: '系统设置', href: '/admin/settings', icon: Activity, color: 'text-orange-600 bg-orange-50' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <a key={item.label} href={item.href}
                className={`flex items-center gap-3 rounded-lg p-4 ${item.color} hover:opacity-80 transition-opacity`}>
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </a>
            );
          })}
        </div>
      </div>

      {/* Recent activity */}
      {stats && stats.reported_content > 0 && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm text-yellow-800">
            📋 近 7 天有 <strong>{stats.reported_content}</strong> 条新内容需要关注
          </p>
        </div>
      )}
    </div>
  );
}
