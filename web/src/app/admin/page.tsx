'use client';

import { useEffect, useState } from 'react';
import { Users, Building2, FileText, Activity, TrendingUp, DollarSign, MessageSquare, AlertTriangle, Server, CheckCircle, XCircle, UserPlus, FilePlus } from 'lucide-react';

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

interface GrowthItem { date: string; count: number; }
interface RecentUser { id: string; username: string; display_name?: string; email?: string; created_at: string; }

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [userGrowth, setUserGrowth] = useState<GrowthItem[]>([]);
  const [postGrowth, setPostGrowth] = useState<GrowthItem[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentSpaces, setRecentSpaces] = useState<{id:string;title:string;namespace:string;created_at:string;owner_username?:string}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchHealth();
    fetchGrowth();
    fetchRecent();
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

  const fetchGrowth = async () => {
    const token = localStorage.getItem('polis_admin_token');
    try {
      const [usersRes, postsRes] = await Promise.all([
        fetch('/api/admin/analytics/users?days=7', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/analytics/posts?days=7', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const usersData = await usersRes.json();
      const postsData = await postsRes.json();
      if (usersData.code === 0) setUserGrowth(usersData.data);
      if (postsData.code === 0) setPostGrowth(postsData.data);
    } catch (e) { console.error(e); }
  };

  const Sparkline = ({ data, color, height = 40 }: { data: GrowthItem[]; color: string; height?: number }) => {
    if (!data || data.length === 0) return <div className="h-10 flex items-center text-xs text-gray-400">暂无数据</div>;
    const maxVal = Math.max(...data.map(d => d.count), 1);
    const width = 150;
    const pad = 4;
    const cw = width - pad * 2;
    const ch = height - pad * 2;
    const points = data.map((d, i) => {
      const x = pad + (i / (data.length - 1)) * cw;
      const y = pad + ch - (d.count / maxVal) * ch;
      return `${x},${y}`;
    }).join(' ');
    const firstPt = `${pad},${pad + ch}`;
    const lastPt = `${pad + cw},${pad + ch}`;
    return (
      <svg width={width} height={height} className="flex-shrink-0">
        <path d={`M${firstPt} L${points} L${lastPt} Z`} fill={`${color}15`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => {
          const x = pad + (i / (data.length - 1)) * cw;
          const y = pad + ch - (d.count / maxVal) * ch;
          return <circle key={i} cx={x} cy={y} r="2" fill={color} />;
        })}
      </svg>
    );
  };

  const fetchRecent = async () => {
    const token = localStorage.getItem('polis_admin_token');
    try {
      const [usersRes, spacesRes] = await Promise.all([
        fetch('/api/admin/users?page=1&page_size=5', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/spaces?page=1&page_size=5', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const usersData = await usersRes.json();
      const spacesData = await spacesRes.json();
      if (usersData.code === 0) {
        const items = usersData.data?.items || usersData.data || [];
        setRecentUsers(items.slice(0, 5));
      }
      if (spacesData.code === 0) {
        const items = spacesData.data?.items || spacesData.data || [];
        setRecentSpaces(items.slice(0, 5));
      }
    } catch (e) { console.error(e); }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    return `${days}天前`;
  };

  const user7dTotal = userGrowth.reduce((s, d) => s + d.count, 0);
  const post7dTotal = postGrowth.reduce((s, d) => s + d.count, 0);

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

      {/* Growth Trends */}
      {(userGrowth.length > 0 || postGrowth.length > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">增长趋势 (7日)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Users Growth */}
            <div className="rounded-lg border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">新增用户</span>
                </div>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{user7dTotal}</span>
              </div>
              <Sparkline data={userGrowth} color="#3b82f6" />
            </div>
            {/* Posts Growth */}
            <div className="rounded-lg border border-green-100 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FilePlus className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">新增帖子</span>
                </div>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">{post7dTotal}</span>
              </div>
              <Sparkline data={postGrowth} color="#22c55e" />
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Feed */}
      {(recentUsers.length > 0 || recentSpaces.length > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">最近动态</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">最新注册用户</h3>
              {recentUsers.length > 0 ? (
                <div className="space-y-2">
                  {recentUsers.map((u, i) => (
                    <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/30 hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          {u.username?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">@{u.username}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{formatTimeAgo(u.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 py-2">暂无数据</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">最新创建社区</h3>
              {recentSpaces.length > 0 ? (
                <div className="space-y-2">
                  {recentSpaces.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/30 hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors">
                      <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{s.title || s.namespace}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">@{s.namespace} · {formatTimeAgo(s.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 py-2">暂无数据</p>
              )}
            </div>
          </div>
        </div>
      )}

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
