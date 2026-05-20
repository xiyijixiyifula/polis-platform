'use client';

import { useState } from 'react';
import { Ban, Shield, Clock } from 'lucide-react';
import { spaces } from '@/lib/api';

interface Props {
  namespace: string;
  userId: string;
  username: string;
  currentRole: string;
  onAction: () => void;
}

const BAN_DURATIONS = [
  { label: '1 小时', hours: 1 },
  { label: '24 小时', hours: 24 },
  { label: '3 天', hours: 72 },
  { label: '7 天', hours: 168 },
  { label: '30 天', hours: 720 },
  { label: '永久', hours: null as any },
];

export function MemberActions({ namespace, userId, username, currentRole, onAction }: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showBanMenu, setShowBanMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBan = async (reason: string, durationHours: number | null) => {
    setLoading(true);
    try {
      await spaces.banMember(namespace, userId, reason, durationHours ?? undefined);
      setShowBanMenu(false);
      onAction();
    } catch (e: any) {
      alert(e?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async () => {
    if (!confirm(`确定要解封 @${username} 吗？`)) return;
    setLoading(true);
    try {
      await spaces.unbanMember(namespace, userId);
      onAction();
    } catch (e: any) {
      alert(e?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSetRole = async (role: string) => {
    setLoading(true);
    try {
      await spaces.setMemberRole(namespace, userId, role);
      setShowDropdown(false);
      onAction();
    } catch (e: any) {
      alert(e?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1 shrink-0" onClick={e => e.preventDefault()}>
      {/* Role dropdown */}
      <div className="relative">
        <button
          onClick={() => { setShowDropdown(!showDropdown); setShowBanMenu(false); }}
          disabled={loading}
          className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="设置角色"
        >
          <Shield className="h-3.5 w-3.5" />
        </button>
        {showDropdown && (
          <div className="absolute right-0 top-full mt-1 w-28 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1 z-[60]">
            {['admin', 'moderator', 'member'].map(role => (
              <button
                key={role}
                onClick={() => handleSetRole(role)}
                disabled={currentRole === role}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                  currentRole === role
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {{'admin': '管理员', 'moderator': '版主', 'member': '成员'}[role]}
                {currentRole === role && <span className="ml-1 text-primary-500">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Ban button */}
      <div className="relative">
        <button
          onClick={() => { setShowBanMenu(!showBanMenu); setShowDropdown(false); }}
          disabled={loading}
          className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title={currentRole === 'banned' ? '解封成员' : '封禁成员'}
        >
          <Ban className="h-3.5 w-3.5" />
        </button>
        {showBanMenu && currentRole !== 'banned' && (
          <div className="absolute right-0 top-full mt-1 w-32 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1 z-[60]">
            <p className="px-3 py-1 text-[10px] text-gray-400 font-medium">封禁时长</p>
            {BAN_DURATIONS.map((d) => (
              <button
                key={d.label}
                onClick={() => handleBan(`被管理员封禁（${d.label}）`, d.hours)}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                  d.hours === null
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {d.label}
                </span>
              </button>
            ))}
          </div>
        )}
        {currentRole === 'banned' && (
          <button
            onClick={handleUnban}
            className="absolute right-0 top-full mt-1 px-2 py-1 text-[10px] bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded hover:bg-green-100 dark:hover:bg-green-900/30 whitespace-nowrap z-[60]"
          >
            解封
          </button>
        )}
      </div>
    </div>
  );
}
