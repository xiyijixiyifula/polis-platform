'use client';

import Link from 'next/link';
import { Home, Flame, Compass, Plus, TrendingUp, Gamepad2, ShoppingBag, BookOpen } from 'lucide-react';

export function Sidebar() {
  const navItems = [
    { icon: Home, label: '首页', href: '/' },
    { icon: Flame, label: '热门', href: '/trending' },
    { icon: Compass, label: '发现', href: '/explore' },
    { icon: TrendingUp, label: '热榜', href: '/hot' },
    { separator: true },
    { icon: BookOpen, label: '文章', href: '/explore?type=article' },
    { icon: Gamepad2, label: '游戏', href: '/explore?type=game' },
    { icon: ShoppingBag, label: '商城', href: '/explore?type=store' },
  ];

  return (
    <aside className="w-56 shrink-0 hidden lg:block">
      <nav className="sticky top-20 space-y-1">
        {navItems.map((item, i) => {
          if ('separator' in item) {
            return <div key={i} className="my-2 border-t border-gray-100" />;
          }
          const Icon = item.icon!;
          return (
            <Link
              key={item.label}
              href={item.href!}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        <div className="mt-4 px-3">
          <Link href="/create" className="btn-primary w-full gap-2 text-xs py-2">
            <Plus className="h-4 w-4" />
            创建社区
          </Link>
        </div>
      </nav>
    </aside>
  );
}
