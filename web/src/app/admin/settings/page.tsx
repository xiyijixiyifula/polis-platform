'use client';

import { useState, useEffect } from 'react';
import { Settings, Shield, Key, Save, AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { getAdminToken } from '@/lib/api';

export default function AdminSettingsPage() {
  const [currentCode, setCurrentCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 上传大小限制
  const [uploadSizeMb, setUploadSizeMb] = useState('50');
  const [videoSizeMb, setVideoSizeMb] = useState('500');
  const [platformLoading, setPlatformLoading] = useState(true);
  const [platformSaving, setPlatformSaving] = useState(false);
  const [platformMsg, setPlatformMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const token = getAdminToken();
    fetch('/api/admin/settings/platform', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 0 && data.data) {
          if (data.data.max_upload_size_mb) {
            const val = typeof data.data.max_upload_size_mb === 'number'
              ? String(data.data.max_upload_size_mb)
              : String(data.data.max_upload_size_mb);
            setUploadSizeMb(val);
          }
          if (data.data.max_video_size_mb) {
            const val = typeof data.data.max_video_size_mb === 'number'
              ? String(data.data.max_video_size_mb)
              : String(data.data.max_video_size_mb);
            setVideoSizeMb(val);
          }
        }
      })
      .catch(() => {})
      .finally(() => setPlatformLoading(false));
  }, []);

  const savePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlatformMsg(null);

    const uploadVal = parseInt(uploadSizeMb, 10);
    const videoVal = parseInt(videoSizeMb, 10);
    if (isNaN(uploadVal) || uploadVal < 1) {
      setPlatformMsg({ type: 'error', text: '附件上传大小必须是有效的正整数' });
      return;
    }
    if (isNaN(videoVal) || videoVal < 1) {
      setPlatformMsg({ type: 'error', text: '视频上传大小必须是有效的正整数' });
      return;
    }

    setPlatformSaving(true);
    try {
      const token = getAdminToken();
      const res = await fetch('/api/admin/settings/platform', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          max_upload_size_mb: uploadVal,
          max_video_size_mb: videoVal,
        }),
      });
      const data = await res.json();
      if (res.ok && data.code === 0) {
        setPlatformMsg({ type: 'success', text: '上传限制已更新。需重启 polis-video 和 polis-gateway 服务使新限制生效。' });
      } else {
        setPlatformMsg({ type: 'error', text: data.message || '保存失败' });
      }
    } catch {
      setPlatformMsg({ type: 'error', text: '网络错误' });
    } finally {
      setPlatformSaving(false);
    }
  };

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
      const token = getAdminToken();
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

  // SMTP 中继邮件配置
  const [mailFrom, setMailFrom] = useState('');
  const [mailFromName, setMailFromName] = useState('');
  const [mailRelayHost, setMailRelayHost] = useState('');
  const [mailRelayPort, setMailRelayPort] = useState('587');
  const [mailRelayUser, setMailRelayUser] = useState('');
  const [mailRelaySaving, setMailRelaySaving] = useState(false);
  const [mailRelayMsg, setMailRelayMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const token = getAdminToken();
    fetch('/api/admin/settings/platform', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 0 && data.data) {
          if (data.data.max_upload_size_mb) {
            const val = typeof data.data.max_upload_size_mb === 'number'
              ? String(data.data.max_upload_size_mb)
              : String(data.data.max_upload_size_mb);
            setUploadSizeMb(val);
          }
          if (data.data.max_video_size_mb) {
            const val = typeof data.data.max_video_size_mb === 'number'
              ? String(data.data.max_video_size_mb)
              : String(data.data.max_video_size_mb);
            setVideoSizeMb(val);
          }
          if (data.data.mail_from) setMailFrom(data.data.mail_from);
          if (data.data.mail_from_name) setMailFromName(data.data.mail_from_name);
          if (data.data.mail_relay_host) setMailRelayHost(data.data.mail_relay_host);
          if (data.data.mail_relay_port) setMailRelayPort(String(data.data.mail_relay_port));
          if (data.data.mail_relay_user) setMailRelayUser(data.data.mail_relay_user);
        }
      })
      .catch(() => {})
      .finally(() => setPlatformLoading(false));
  }, []);

  const saveMailRelay = async (e: React.FormEvent) => {
    e.preventDefault();
    setMailRelayMsg(null);
    setMailRelaySaving(true);
    try {
      const token = getAdminToken();
      const settings: Record<string, any> = {
        mail_from: mailFrom,
        mail_from_name: mailFromName,
      };
      if (mailRelayHost) {
        settings.mail_relay_host = mailRelayHost;
        settings.mail_relay_port = parseInt(mailRelayPort, 10) || 587;
        settings.mail_relay_user = mailRelayUser;
        // 密码仅在填入时更新
      }
      const res = await fetch('/api/admin/settings/platform', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok && data.code === 0) {
        setMailRelayMsg({ type: 'success', text: '邮件配置已保存！请在服务器上运行 postfix reload 使配置生效。' });
      } else {
        setMailRelayMsg({ type: 'error', text: data.message || '保存失败' });
      }
    } catch {
      setMailRelayMsg({ type: 'error', text: '网络错误' });
    } finally {
      setMailRelaySaving(false);
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

      {/* 上传大小限制 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">上传大小限制</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          设置附件和视频的最大上传大小（MB）。修改后即时写入数据库，但需重启对应服务使新限制在网关层生效。
        </p>

        {platformLoading ? (
          <div className="text-sm text-gray-400"><span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2 align-middle"></span>加载中...</div>
        ) : (
          <>
            {platformMsg && (
              <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${
                platformMsg.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
              }`}>
                {platformMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {platformMsg.text}
              </div>
            )}

            <form onSubmit={savePlatformSettings} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  附件上传大小 (MB)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    min={1}
                    value={uploadSizeMb}
                    onChange={(e) => setUploadSizeMb(e.target.value)}
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">MB</span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  应用于帖子附件、文件上传等。服务器重启后网关层限制生效。
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  视频上传大小 (MB)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    min={1}
                    value={videoSizeMb}
                    onChange={(e) => setVideoSizeMb(e.target.value)}
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">MB</span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  应用于视频上传。需重启 polis-video 和 polis-gateway 服务。
                </p>
              </div>
              <button
                type="submit"
                disabled={platformSaving}
                className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {platformSaving ? (
                  <>保存中...</>
                ) : (
                  <><Save className="h-4 w-4" /> 保存上传限制</>
                )}
              </button>
            </form>
          </>
        )}
      </div>

      {/* SMTP 中继邮件配置 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">邮件中继服务配置</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Polis 使用 Postfix + SMTP 中继方案发送邮件（密码重置等）。配置后重启 Postfix 生效: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">postfix reload</code>
        </p>

        {mailRelayMsg && (
          <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${
            mailRelayMsg.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          }`}>
            {mailRelayMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {mailRelayMsg.text}
          </div>
        )}

        {platformLoading ? (
          <div className="text-sm text-gray-400">加载中...</div>
        ) : (
          <form onSubmit={saveMailRelay} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">发件邮箱</label>
                <input type="email" value={mailFrom} onChange={(e) => setMailFrom(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" placeholder="polis@mzgw.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">发件人名称</label>
                <input type="text" value={mailFromName} onChange={(e) => setMailFromName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" placeholder="Polis" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">中继服务器 (SMTP Relay)</label>
                <input type="text" value={mailRelayHost} onChange={(e) => setMailRelayHost(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" placeholder="smtp.gmail.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">端口</label>
                <input type="number" value={mailRelayPort} onChange={(e) => setMailRelayPort(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" placeholder="587" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">中继账号</label>
              <input type="text" value={mailRelayUser} onChange={(e) => setMailRelayUser(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" placeholder="your@gmail.com" />
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500">
              凭证保存在服务器 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">/etc/postfix/sasl_passwd</code>。配置格式: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">[smtp.host]:port username:password</code>。配置后运行 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">postmap /etc/postfix/sasl_passwd && postfix reload</code>。
            </p>

            <button type="submit" disabled={mailRelaySaving}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50">
              {mailRelaySaving ? <>保存中...</> : <><Save className="h-4 w-4" /> 保存邮件配置</>}
            </button>
          </form>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mt-6">
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
