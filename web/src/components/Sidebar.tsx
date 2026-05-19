'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Flame, Compass, Plus, TrendingUp, Gamepad2, ShoppingBag, BookOpen, PenLine, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Sidebar() {
  const pathname = usePathname();
  const [createLocked, setCreateLocked] = useState(false);

  // 路由切换时短暂锁定「创建社区」按钮，防止 layout shift 导致误触
  useEffect(() => {
    setCreateLocked(true);
    const t = setTimeout(() => setCreateLocked(false), 500);
    return () => clearTimeout(t);
  }, [pathname]);

  const navItems = [
    { icon: Home, label: '首页', href: '/' },
    { icon: Flame, label: '热门', href: '/trending' },
    { icon: Compass, label: '发现', href: '/explore' },
    { icon: TrendingUp, label: '热榜', href: '/hot' },
    { icon: PenLine, label: '创作中心', href: '/create-center' },
    { icon: FileText, label: '我的创作', href: '/creations' },
    { separator: true },
    { icon: BookOpen, label: '文章', href: '/explore?type=article' },
    { icon: Gamepad2, label: '游戏', href: '/explore?type=game' },
    { icon: ShoppingBag, label: '商城', href: '/explore?type=store' },
  ];

  return (
    <aside className="w-56 shrink-0 hidden lg:block sidebar-dark rounded-r-2xl mr-4 my-4">
      <nav className="sticky top-24 space-y-1 p-3">
        {/* Logo 区域 */}
        <div className="mb-4 px-3 py-2">
          <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <span className="text-white text-sm">P</span>
            </div>
            <span>Polis</span>
          </Link>
        </div>

        {navItems.map((item, i) => {
          if ('separator' in item) {
            return <div key={i} className="my-2 border-t border-slate-700/50" />;
          }
          const Icon = item.icon!;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.label}
              href={item.href!}
              className={`nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                isActive ? 'active' : ''
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        <div className="mt-4 px-3">
          <Link
            href={createLocked ? '#' : '/create'}
            onClick={createLocked ? (e) => e.preventDefault() : undefined}
            className={`btn-ripple flex items-center justify-center gap-2 w-full rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs py-2.5 transition-all hover:shadow-glow ${
              createLocked ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Plus className="h-4 w-4" />
            创建社区
          </Link>
        </div>
      </nav>
    </aside>
  );
}
