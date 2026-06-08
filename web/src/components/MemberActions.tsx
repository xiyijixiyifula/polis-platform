'use client';

import { useState } from 'react';
import { Ban, Shield, Clock, X } from 'lucide-react';
import { spaces } from '@/lib/api';
import { toastError } from '@/stores/toastStore';

interface Props {
  namespace: string;
  userId: string;
  username: string;
  currentRole: string;
  onAction: () => void;
}

const BAN_DURATIONS = [
  { label: '1h', hours: 1 },
  { label: '24h', hours: 24 },
  { label: '3d', hours: 72 },
  { label: '7d', hours: 168 },
  { label: '30d', hours: 720 },
  { label: '永久', hours: null as any },
];

const ROLE_OPTIONS = [
  { role: 'admin', label: '管理员', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
  { role: 'moderator', label: '版主', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  { role: 'member', label: '成员', color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' },
];

export function MemberActions({ namespace, userId, username, currentRole, onAction }: Props) {
  const [showRoles, setShowRoles] = useState(false);
  const [showBan, setShowBan] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBan = async (reason: string, durationHours: number | null) => {
    setLoading(true);
    try {
      await spaces.banMember(namespace, userId, reason, durationHours ?? undefined);
      setShowBan(false);
      onAction();
    } catch (e: any) {
      toastError(e?.message || '操作失败');
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
      toastError(e?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSetRole = async (role: string) => {
    setLoading(true);
    try {
      await spaces.setMemberRole(namespace, userId, role);
      setShowRoles(false);
      onAction();
    } catch (e: any) {
      toastError(e?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const cancelAll = () => { setShowRoles(false); setShowBan(false); };

  return (
    <div className="flex items-center gap-1 shrink-0" onClick={e => e.preventDefault()}>
      {/* 横向行内角色选择 */}
      {showRoles ? (
        <div className="flex items-center gap-1">
          {ROLE_OPTIONS.map(opt => (
            <button
              key={opt.role}
              onClick={() => handleSetRole(opt.role)}
              disabled={loading || currentRole === opt.role}
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors whitespace-nowrap ${
                currentRole === opt.role
                  ? 'ring-1 ring-primary-400 opacity-70'
                  : 'hover:opacity-80'
              } ${opt.color}`}
            >
              {opt.label}
            </button>
          ))}
          <button onClick={cancelAll} className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : showBan ? (
        /* 横向行内封禁时长选择 */
        <div className="flex items-center gap-1">
          {BAN_DURATIONS.map((d) => (
            <button
              key={d.label}
              onClick={() => handleBan(`被管理员封禁（${d.label}）`, d.hours)}
              disabled={loading}
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors whitespace-nowrap ${
                d.hours === null
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {d.label}
            </button>
          ))}
          <button onClick={cancelAll} className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : currentRole === 'banned' ? (
        <button
          onClick={handleUnban}
          className="text-[10px] px-2 py-0.5 rounded font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/40 whitespace-nowrap transition-colors"
        >
          解封
        </button>
      ) : (
        /* 默认按钮 */
        <>
          <button
            onClick={() => { setShowRoles(true); setShowBan(false); }}
            disabled={loading}
            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="设置角色"
          >
            <Shield className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setShowBan(true); setShowRoles(false); }}
            disabled={loading}
            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="封禁成员"
          >
            <Ban className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
