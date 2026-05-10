'use client';

import { useState } from 'react';
import { Settings, Shield, Key, Save, AlertCircle, CheckCircle } from 'lucide-react';

export default function AdminSettingsPage() {
  const [currentCode, setCurrentCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newCode.length < 8) {
      setMessage({ type: 'error', text: '新验证码至少 8 个字符' });
      return;
    }
    if (newCode !== confirmCode) {
      setMessage({ type: 'error', text: '两次输入的新验证码不一致' });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('polis_admin_token');
      const res = await fetch('/api/admin/settings/code', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_code: currentCode,
          new_code: newCode,
        }),
      });
      const data = await res.json();
      if (res.ok && data.code === 0) {
        setMessage({ type: 'success', text: '验证码更新成功！下次登录请使用新验证码。' });
        setCurrentCode('');
        setNewCode('');
        setConfirmCode('');
      } else {
        setMessage({ type: 'error', text: data.message || '更新失败，请检查当前验证码是否正确' });
      }
    } catch {
      setMessage({ type: 'error', text: '网络错误' });
    } finally {
      setLoading(false);
    }
  };

  const configItems = [
    { icon: Shield, label: '管理员邮箱', value: 'admin@polis.app', desc: '用于后台登录的管理员账号' },
    { icon: Key, label: '验证码状态', value: '已设置', desc: '可在下方修改管理验证码' },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary-100 dark:bg-primary-800 flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary-600 dark:text-primary-300" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">系统设置</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">管理后台配置与安全</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {configItems.map((item) => (
          <div key={item.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                <item.icon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{item.value}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{item.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Key className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">修改管理验证码</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          修改后即时生效，无需重启服务。新验证码将写入服务器持久化存储。
        </p>

        {message && (
          <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${
            message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">当前验证码</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="输入当前管理验证码"
              value={currentCode}
              onChange={(e) => setCurrentCode(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">新验证码</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="至少 8 个字符"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">确认新验证码</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="再次输入新验证码"
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>保存中...</>
            ) : (
              <><Save className="h-4 w-4" /> 更新验证码</>
            )}
          </button>
        </form>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">提示</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
              <li>修改验证码后即时生效，无需重启服务</li>
              <li>当前已登录的 token 不受影响</li>
              <li>新的登录必须使用新验证码</li>
              <li>验证码持久化存储在服务器文件中，服务重启后仍有效</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
