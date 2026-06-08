'use client';

import { useEffect, useState } from 'react';
import { Gift, Copy, Check, Users, Share2, ArrowLeft, Loader2 } from 'lucide-react';
import { invites, InviteInfo, getToken } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function InvitesPage() {
  const router = useRouter();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [created, setCreated] = useState(false);

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    invites.get()
      .then(res => {
        if (res.data) setInfo(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const handleCreate = async () => {
    const res = await invites.create();
    if (res.data) { setInfo(res.data); setCreated(true); }
  };

  const copyLink = async () => {
    if (!info) return;
    const url = info.invite_url || `https://polis.app/register?invite=${info.code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" />
        返回首页
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">邀请好友</h1>

      {!info ? (
        <div className="glass-card p-8 text-center">
          <Gift className="h-16 w-16 text-pink-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">🎁 还没有邀请码</h2>
          <p className="text-gray-500 mb-6">生成邀请码，邀请好友加入 Polis，双方各得 100 XP</p>
          <button
            onClick={handleCreate}
            className="btn-primary px-6 py-2.5 rounded-full text-sm"
          >
            <Gift className="h-4 w-4 inline mr-1" />
            生成我的邀请码
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">你的邀请码</h3>
            <div className="flex items-center gap-3 mb-4">
              <code className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-lg font-mono font-bold text-gray-900 dark:text-white text-center tracking-wider">
                {info.code}
              </code>
              <button
                onClick={copyLink}
                className="shrink-0 p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-200 transition-colors"
              >
                {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={copyLink}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium text-sm hover:bg-primary-100 transition-colors"
              >
                <Copy className="h-4 w-4" />
                复制链接
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: '加入 Polis',
                      text: '来 Polis 一起玩吧！用这个链接注册，我们都能获得 XP 奖励！',
                      url: info.invite_url || `https://polis.app/register?invite=${info.code}`,
                    }).catch(() => {});
                  } else {
                    copyLink();
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium text-sm hover:bg-blue-100 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                分享给好友
              </button>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">邀请统计</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <Users className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{info.total_invited || 0}</p>
                <p className="text-xs text-gray-500">已邀请好友</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <Gift className="h-6 w-6 text-pink-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{info.total_rewards_xp || 0}</p>
                <p className="text-xs text-gray-500">获得 XP</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
