'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', admin_code: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || data.code !== 0) {
        setError(data.message || '登录失败');
      } else {
        localStorage.setItem('polis_admin_token', data.data.access_token);
        router.push('/admin');
      }
    } catch {
      setError('网络错误');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 mb-4">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Polis 管理后台</h1>
          <p className="text-sm text-gray-400 mt-1">输入管理员凭证登录</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 space-y-4 shadow-xl">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input type="email" className="input-field" placeholder="admin@polis.app" required
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">管理员验证码</label>
            <input type="text" className="input-field" placeholder="请输入管理员验证码"
              value={form.admin_code} onChange={(e) => setForm({ ...form, admin_code: e.target.value })} required />
          </div>
          <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
            {loading ? '验证中...' : '进入管理后台'}
          </button>
        </form>
      </div>
    </div>
  );
}
