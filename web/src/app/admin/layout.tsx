'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Building2, FileText, Settings, LogOut, Shield, AlertTriangle, MessageSquare, DollarSign, TrendingUp, ClipboardCheck, History, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getAdminToken, setAdminToken } from '@/lib/api';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
    // Validate admin token — stale/invalid tokens cause empty data with 401
    const token = getAdminToken();
    if (token) {
      fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          if (res.status === 401) {
            setAdminToken(null);
            window.location.href = '/admin/login';
          }
        })
        .catch(() => {});
    }
  }, []);

  // Login page does not need the admin layout
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // During SSR/hydration, do not redirect
  if (!mounted) {
    return null;
  }

  // Synchronous token check - evaluates on every client-side render
  const isAdmin = !!getAdminToken();

  if (!isAdmin) {
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
    return null;
  }

  const navItems = [
    { icon: LayoutDashboard, label: '仪表盘', href: '/admin' },
    { icon: Users, label: '用户管理', href: '/admin/users' },
    { icon: Building2, label: '社区管理', href: '/admin/spaces' },
    { icon: FileText, label: '内容管理', href: '/admin/posts' },
    { icon: MessageSquare, label: '评论管理', href: '/admin/comments' },
    { icon: ClipboardCheck, label: '审查队列', href: '/admin/review-queue' },
    { icon: Shield, label: '审查规则', href: '/admin/review-rules' },
    { icon: AlertTriangle, label: '举报管理', href: '/admin/reports' },
    { icon: History, label: '操作日志', href: '/admin/audit-logs' },
    { icon: DollarSign, label: '交易管理', href: '/admin/transactions' },
    { icon: TrendingUp, label: '数据分析', href: '/admin/analytics' },
    { icon: Settings, label: '系统设置', href: '/admin/settings' },
  ];

  const handleLogout = () => {
    setAdminToken(null);
    window.location.href = '/admin/login';
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — hidden on mobile, shown as overlay when toggled */}
      <aside className={`w-56 shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col
        fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-2 px-5 h-14 border-b border-gray-200 dark:border-gray-700">
          <div className="h-7 w-7 rounded-lg bg-primary-600 flex items-center justify-center text-white text-xs font-bold">P</div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">Polis 管理</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden mb-4 p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label="打开菜单"
          >
            <Menu className="h-5 w-5" />
          </button>
          {children}
        </div>
      </main>
    </div>
  );
}