'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Building2, FileText, Settings, LogOut, Shield, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
  const isAdmin = !!localStorage.getItem('polis_admin_token');

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
    { icon: AlertTriangle, label: '举报管理', href: '/admin/reports' },
    { icon: Settings, label: '系统设置', href: '/admin/settings' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('polis_admin_token');
    window.location.href = '/admin/login';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="flex items-center gap-2 px-5 h-14 border-b border-gray-200">
          <div className="h-7 w-7 rounded-lg bg-primary-600 flex items-center justify-center text-white text-xs font-bold">P</div>
          <span className="font-semibold text-gray-900">Polis 管理</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-200">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}