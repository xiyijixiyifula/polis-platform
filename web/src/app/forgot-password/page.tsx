'use client';

import { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setSent(true);
      } else {
        setError(data.message || '发送失败，请稍后重试');
      }
    } catch {
      setError('网络错误，请检查网络连接后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Mail className="h-10 w-10 mx-auto text-primary-600 mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">找回密码</h1>
          <p className="text-sm text-gray-500 mt-1">输入注册邮箱接收重置链接</p>
        </div>

        {sent ? (
          <div className="card text-center py-8 space-y-3">
            <div className="text-4xl">📧</div>
            <p className="text-gray-700">重置链接已发送</p>
            <p className="text-sm text-gray-500">请检查 {email} 的收件箱</p>
            <Link href="/login" className="btn-primary inline-block mt-4 px-6 py-2">返回登录</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">注册邮箱</label>
              <input type="email" className="input-field" placeholder="your@email.com" required
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? '发送中...' : '发送重置链接'}
            </button>
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
            <Link href="/login" className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-3.5 w-3.5" /> 返回登录
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
