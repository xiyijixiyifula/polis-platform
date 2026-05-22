'use client';

import { useState, useEffect } from 'react';

interface NotificationPrefs {
  liked?: boolean;
  commented?: boolean;
  followed?: boolean;
  invited?: boolean;
  system?: boolean;
}

export default function SettingsPage() {
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState({ display_name: '', bio: '' });
  const [password, setPassword] = useState({ old: '', new: '', confirm: '' });
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    liked: true, commented: true, followed: true, invited: true, system: true,
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const getToken = () => localStorage.getItem('polis_access_token');

  // Load user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/users/me', {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data.code === 0 && data.data) {
          setProfile({
            display_name: data.data.display_name || '',
            bio: data.data.bio || '',
          });
          if (data.data.notification_prefs && typeof data.data.notification_prefs === 'object') {
            setNotifPrefs({
              liked: data.data.notification_prefs.liked ?? true,
              commented: data.data.notification_prefs.commented ?? true,
              followed: data.data.notification_prefs.followed ?? true,
              invited: data.data.notification_prefs.invited ?? true,
              system: data.data.notification_prefs.system ?? true,
            });
          }
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') console.error('Failed to load profile', e);
      } finally {
        setLoading(false);
      }
    };
    if (getToken()) loadProfile();
    else setLoading(false);
  }, []);

  const updateProfile = async () => {
    const body: Record<string, unknown> = { ...profile, notification_prefs: notifPrefs };
    const res = await fetch('/api/users/me', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setMsg(data.code === 0 ? '✅ 已保存' : '❌ ' + (data.message || '失败'));
  };

  const changePassword = async () => {
    if (password.new !== password.confirm) { setMsg('❌ 两次密码不一致'); return; }
    if (password.new.length < 8) { setMsg('❌ 密码至少 8 位'); return; }
    const res = await fetch('/api/users/me/password', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ old_password: password.old, new_password: password.new }),
    });
    const data = await res.json();
    setMsg(data.code === 0 ? '✅ 密码已修改' : '❌ ' + (data.message || '失败'));
    if (data.code === 0) setPassword({ old: '', new: '', confirm: '' });
  };

  const toggleNotif = (key: keyof NotificationPrefs) => {
    setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-32" />
          <div className="h-64 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">账号设置</h1>
      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        {['profile', 'password', 'notifications'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-3 text-sm font-medium border-b-2 ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>
            {{ profile: '个人资料', password: '修改密码', notifications: '通知偏好' }[t]}
          </button>
        ))}
      </div>

      {msg && <div className={`mb-4 p-3 rounded-lg text-sm ${msg.startsWith('✅') ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>{msg}</div>}

      {tab === 'profile' && (
        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">显示名称</label>
            <input className="input-field" value={profile.display_name}
              onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">个人简介</label>
            <textarea className="input-field resize-none" rows={3} value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
          </div>
          <button onClick={updateProfile} className="btn-primary">保存</button>
        </div>
      )}

      {tab === 'password' && (
        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">当前密码</label>
            <input type="password" className="input-field" value={password.old}
              onChange={(e) => setPassword({ ...password, old: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">新密码</label>
            <input type="password" className="input-field" value={password.new}
              onChange={(e) => setPassword({ ...password, new: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">确认新密码</label>
            <input type="password" className="input-field" value={password.confirm}
              onChange={(e) => setPassword({ ...password, confirm: e.target.value })} />
          </div>
          <button onClick={changePassword} className="btn-primary">修改密码</button>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="card space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">选择您希望接收的通知类型：</p>
          {[
            { key: 'liked' as const, label: '被点赞时通知' },
            { key: 'commented' as const, label: '新评论通知' },
            { key: 'followed' as const, label: '新关注者通知' },
            { key: 'invited' as const, label: '社区邀请通知' },
            { key: 'system' as const, label: '系统公告' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between py-2 cursor-pointer">
              <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
              <input
                type="checkbox"
                checked={notifPrefs[key] ?? true}
                onChange={() => toggleNotif(key)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </label>
          ))}
          <button onClick={updateProfile} className="btn-primary mt-4">保存偏好</button>
        </div>
      )}
    </div>
  );
}
