'use client';

import { useEffect, useState } from 'react';
import { Users, Building2, FileText, Activity, TrendingUp, DollarSign, MessageSquare, AlertTriangle, Server, CheckCircle, XCircle } from 'lucide-react';

interface Stats {
  total_users: number; total_spaces: number; total_posts: number;
  total_comments: number; total_transactions: number;
  active_users_today: number; new_users_today: number; new_posts_today: number;
  reported_content: number;
}

interface ServiceStatus {
  service: string;
  status: string;
  database: boolean;
  version: string;
}

interface HealthData {
  all_healthy: boolean;
  gateway: string;
  services: {
    admin: ServiceStatus;
    content: ServiceStatus;
    space: ServiceStatus;
    user: ServiceStatus;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchHealth();
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

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health/all');
      const data = await res.json();
      if (data.code === 0) setHealth(data.data);
    } catch (e) { console.error(e); }
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

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">加载中...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">仪表盘</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">平台运营数据概览</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{card.value.toLocaleString()}</p>
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
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">快捷操作</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: '用户管理', href: '/admin/users', icon: Users, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' },
            { label: '社区管理', href: '/admin/spaces', icon: Building2, color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' },
            { label: '内容审核', href: '/admin/posts', icon: FileText, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400' },
            { label: '评论管理', href: '/admin/comments', icon: MessageSquare, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400' },
            { label: '举报处理', href: '/admin/reports', icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400' },
            { label: '交易流水', href: '/admin/transactions', icon: DollarSign, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20 dark:text-teal-400' },
            { label: '数据分析', href: '/admin/analytics', icon: TrendingUp, color: 'text-pink-600 bg-pink-50 dark:bg-pink-900/20 dark:text-pink-400' },
            { label: '系统设置', href: '/admin/settings', icon: Activity, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400' },
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

      {/* System Health */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Server className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">系统状态</h2>
          {health && (
            <span className={`ml-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
              health.all_healthy
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {health.all_healthy ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {health.all_healthy ? '全部正常' : '部分异常'}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {health ? [
            { name: '网关', key: 'gateway', status: health.gateway },
            { name: '用户服务', key: 'user', status: health.services?.user?.status },
            { name: '空间服务', key: 'space', status: health.services?.space?.status },
            { name: '内容服务', key: 'content', status: health.services?.content?.status },
            { name: '管理后台', key: 'admin', status: health.services?.admin?.status },
          ].map((svc) => (
            <div key={svc.key}
              className={`flex items-center gap-3 rounded-lg p-3 border ${
                svc.status === 'healthy'
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
                  : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10'
              }`}>
              <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                svc.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{svc.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{svc.status}</p>
              </div>
            </div>
          )) : (
            <div className="col-span-full text-sm text-gray-400 dark:text-gray-500 py-2">加载中...</div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      {stats && stats.reported_content > 0 && (
        <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            📋 有 <strong>{stats.reported_content}</strong> 条待处理举报需要审核
          </p>
        </div>
      )}
    </div>
  );
}
