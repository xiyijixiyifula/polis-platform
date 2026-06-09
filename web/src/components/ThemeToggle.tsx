'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * 深色模式切换按钮
 *
 * 设计决策：深色模式仅由用户手动触发，不跟随系统偏好。
 * 这样避免用户在不期望时被迫进入深色模式（例如 OLED 屏幕强光环境
 * 下仍然需要亮色模式以获得足够对比度）。
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // Head 脚本已提前设置 dark class，这里只同步 React 状态
    // 不再操作 DOM 以避免闪烁
    const saved = localStorage.getItem('polis_theme');
    if (saved === 'dark') {
      setDark(true);
    }
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('polis_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('polis_theme', 'light');
    }
  };

  return (
    <button
      onClick={toggle}
      className="rounded-full p-2.5 transition-colors"
      style={{ color: dark ? '#0A84FF' : '#86868b' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = dark ? 'rgba(10,132,255,0.1)' : 'rgba(0,0,0,0.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
      title={dark ? '切换亮色模式' : '切换深色模式'}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
