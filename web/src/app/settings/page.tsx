'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState({ display_name: '', bio: '' });
  const [password, setPassword] = useState({ old: '', new: '', confirm: '' });
  const [msg, setMsg] = useState('');

  const getToken = () => localStorage.getItem('polis_access_token');

  const updateProfile = async () => {
    const res = await fetch('/api/users/me', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(profile),
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">账号设置</h1>
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        {['profile', 'password', 'notifications'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-3 text-sm font-medium border-b-2 ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>
            {{ profile: '个人资料', password: '修改密码', notifications: '通知偏好' }[t]}
          </button>
        ))}
      </div>

      {msg && <div className="mb-4 p-3 rounded-lg text-sm bg-blue-50 text-blue-700">{msg}</div>}

      {tab === 'profile' && (
        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">显示名称</label>
            <input className="input-field" value={profile.display_name}
              onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">个人简介</label>
            <textarea className="input-field resize-none" rows={3} value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
          </div>
          <button onClick={updateProfile} className="btn-primary">保存</button>
        </div>
      )}

      {tab === 'password' && (
        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">当前密码</label>
            <input type="password" className="input-field" value={password.old}
              onChange={(e) => setPassword({ ...password, old: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
            <input type="password" className="input-field" value={password.new}
              onChange={(e) => setPassword({ ...password, new: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
            <input type="password" className="input-field" value={password.confirm}
              onChange={(e) => setPassword({ ...password, confirm: e.target.value })} />
          </div>
          <button onClick={changePassword} className="btn-primary">修改密码</button>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="card space-y-4">
          {['被点赞时通知', '新评论通知', '新关注者通知', '社区邀请通知', '系统公告'].map((item) => (
            <label key={item} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">{item}</span>
              <input type="checkbox" defaultChecked className="rounded border-gray-300 text-primary-600" />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
