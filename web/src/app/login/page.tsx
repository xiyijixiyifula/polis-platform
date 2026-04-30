'use client';

import { useState, useEffect } from 'react';

export default function LoginPage() {
  const [redirect, setRedirect] = useState('/');
  const [form, setForm] = useState({ email: '', password: '' });
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
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || '登录失败');
      } else {
        localStorage.setItem('polis_access_token', data.data.access_token);
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">登录 Polis</h1>
          <p className="mt-2 text-sm text-gray-600">欢迎回来</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">邮箱</label>
            <input
              type="email"
              className="input-field mt-1"
              placeholder="your@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">密码</label>
            <input
              type="password"
              className="input-field mt-1"
              placeholder="输入密码"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

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
        <p className="mt-2 text-center text-xs text-gray-400">
          测试账号: test@example.com / Test1234! (用户名: testuser)
        </p>
      </div>
    </div>
  );
}
