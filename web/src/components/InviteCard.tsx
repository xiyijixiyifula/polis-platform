'use client';

import { useEffect, useState } from 'react';
import { Gift, Copy, Check, Users, Share2 } from 'lucide-react';
import { invites, InviteInfo, getToken } from '@/lib/api';

export default function InviteCard() {
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!getToken()) return;
    invites.get()
      .then(res => { if (res.data) setInfo(res.data); })
      .catch(() => {});
  }, []);

  const copyLink = async () => {
    if (!info) return;
    const url = info.invite_url || `https://polis.app/register?invite=${info.code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!info) return null;

  return (
    <div className="glass-card p-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
        <Gift className="h-5 w-5 text-pink-500" />
        邀请好友
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        邀请好友加入 Polis，双方各得 <span className="font-semibold text-pink-500">100 XP</span>
      </p>
      <div className="flex items-center gap-2 mb-3">
        <code className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-mono text-gray-700 dark:text-gray-300 truncate">
          {info.code}
        </code>
        <button
          onClick={copyLink}
          className="shrink-0 p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-200 transition-colors"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          已邀请 {info.total_invited || 0} 人
        </span>
        <span className="flex items-center gap-1">
          <Gift className="h-3 w-3" />
          获得 {info.total_rewards_xp || 0} XP
        </span>
      </div>
    </div>
  );
}
