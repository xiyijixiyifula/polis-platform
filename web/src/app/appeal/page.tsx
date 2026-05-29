'use client';

import { useState } from 'react';

export default function AppealPage() {
  const [form, setForm] = useState({ email: '', reason: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'submitted' | 'error'>('idle');
  const [banInfo, setBanInfo] = useState<{ banned: boolean; ban_reason?: string; banned_at?: string } | null>(null);
  const [emailChecked, setEmailChecked] = useState(false);

  const checkBanStatus = async (email: string) => {
    if (!email) return;
    try {
      const res = await fetch(`/api/user/ban-status?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.code === 0) {
        setBanInfo(data.data);
        setEmailChecked(true);
      }
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.reason) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/user/appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.code === 0) {
        setStatus('submitted');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'submitted') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black px-4">
        <div className="w-full max-w-md text-center">
          <div className="card p-8">
            <div className="text-green-500 text-5xl mb-4">&#10003;</div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">申诉已提交</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              我们已收到你的申诉，管理员将在 1-3 个工作日内审核处理。如有疑问请联系 admin@polis.app。
            </p>
            <a href="/login" className="text-primary-600 hover:text-primary-500 text-sm">返回登录</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">账号申诉</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            如果你的账号被封禁，可以在此提交申诉
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {status === 'error' && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">提交失败，请稍后重试或联系管理员</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">注册邮箱</label>
            <input
              type="email"
              className="input-field mt-1"
              placeholder="your@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              onBlur={(e) => checkBanStatus(e.target.value)}
              required
            />
          </div>

          {emailChecked && banInfo && !banInfo.banned && (
            <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">
              该账号未被封禁，如有其他问题请联系管理员
            </div>
          )}

          {emailChecked && banInfo && banInfo.banned && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              <p className="font-medium">封禁状态</p>
              {banInfo.ban_reason && <p className="mt-1">原因：{banInfo.ban_reason}</p>}
              {banInfo.banned_at && <p>封禁时间：{new Date(banInfo.banned_at).toLocaleString('zh-CN')}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">申诉理由</label>
            <textarea
              className="input-field mt-1"
              rows={4}
              placeholder="请详细说明申诉理由..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={status === 'loading'}>
            {status === 'loading' ? '提交中...' : '提交申诉'}
          </button>

          <div className="text-center">
            <a href="/login" className="text-sm text-gray-500 hover:text-primary-600">返回登录</a>
          </div>
        </form>
      </div>
    </div>
  );
}
