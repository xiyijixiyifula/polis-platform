'use client';

import { useState } from 'react';
import { Ban, Shield } from 'lucide-react';
import { spaces } from '@/lib/api';

interface Props {
  namespace: string;
  userId: string;
  username: string;
  currentRole: string;
  onAction: () => void;
}

export function MemberActions({ namespace, userId, username, currentRole, onAction }: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBan = async () => {
    if (!confirm(`确定要封禁 @${username} 吗？`)) return;
    setLoading(true);
    try {
      await spaces.banMember(namespace, userId);
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
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={loading}
          className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="设置角色"
        >
          <Shield className="h-3.5 w-3.5" />
        </button>
        {showDropdown && (
          <div className="absolute right-0 top-full mt-1 w-28 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1 z-50">
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
      <button
        onClick={handleBan}
        disabled={loading}
        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        title="封禁成员"
      >
        <Ban className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
