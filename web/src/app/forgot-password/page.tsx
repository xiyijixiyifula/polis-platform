'use client';

import { useState } from 'react';
import { Mail, ArrowLeft, Loader2, Send } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('请输入有效的邮箱地址');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setSent(true);
      } else {
        setError(data.message || '发送失败，请重试');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="text-5xl mb-4">📧</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">邮件已发送</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          如果 <strong>{email}</strong> 已注册，重置链接已发送到你的邮箱。
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">请检查邮箱（含垃圾箱），链接 1 小时内有效。</p>
        <Link href="/login" className="btn-primary">返回登录</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Link href="/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-8">
        <ArrowLeft className="h-4 w-4" /> 返回登录
      </Link>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary-100 dark:bg-primary-900/20 mb-4">
          <Mail className="h-7 w-7 text-primary-600 dark:text-primary-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">忘记密码</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">输入注册邮箱，我们会发送重置链接</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">邮箱地址</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="you@example.com"
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {loading ? '发送中...' : '发送重置链接'}
        </button>
      </form>
    </div>
  );
}
