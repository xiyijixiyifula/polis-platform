'use client';

import { useState, useEffect } from 'react';
import { setToken } from '@/lib/api';

export default function LoginPage() {
  const [redirect, setRedirect] = useState('/');
  const [form, setForm] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('redirect');
    if (r) setRedirect(r);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, remember_me: rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || '登录失败');
      } else {
        setToken(data.data.access_token);
        if (data.data.user) {
          localStorage.setItem('polis_user', JSON.stringify(data.data.user));
        }
        window.location.href = redirect;
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">登录 Polis — 连接思想，共创未来</h1>
          <p className="mt-2 text-sm text-gray-600">欢迎回来</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
              {(error.includes('Forbidden:') || error.includes('封禁') || error.includes('冻结')) && (
                <div className="mt-2 pt-2 border-t border-red-200">
                  <a href="/appeal" className="text-primary-600 hover:text-primary-500 font-medium">申请申诉 &rarr;</a>
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700">邮箱</label>
            <input
              id="login-email"
              name="email"
              type="email"
              className="input-field mt-1"
              placeholder="your@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">密码</label>
            <input
              id="login-password"
              name="password"
              type="password"
              className="input-field mt-1"
              placeholder="输入密码"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <label htmlFor="login-remember" className="flex items-center gap-2 cursor-pointer select-none">
            <input
              id="login-remember"
              name="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">记住我（保持登录 30 天）</span>
          </label>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
          <div className="text-center">
            <a href="/forgot-password" className="text-sm text-gray-500 hover:text-primary-600">忘记密码？</a>
          </div>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          没有账号？<a href="/register" className="text-primary-600 hover:text-primary-500">注册</a>
        </p>
      </div>
    </div>
  );
}
