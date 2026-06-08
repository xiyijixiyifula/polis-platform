'use client';

import { useEffect, useState } from 'react';
import { Trophy, Crown, Medal, Users, Heart, Loader2 } from 'lucide-react';
import { leaderboard, tips, LeaderboardEntry } from '@/lib/api';
import Link from 'next/link';

export default function LeaderboardPage() {
  const [tab, setTab] = useState<'creators' | 'tippers'>('creators');
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'all_time'>('weekly');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetcher = tab === 'creators' ? leaderboard.get : tips.getLeaderboard;
    fetcher(period)
      .then(res => { if (res.data) setEntries(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tab, period]);

  const rankDisplay = (rank: number) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-amber-400" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-300" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
    return <span className="text-lg font-bold text-gray-400 w-6 text-center">{rank}</span>;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
          <Trophy className="h-8 w-8 text-amber-500" />
          排行榜
        </h1>
        <p className="text-gray-500 mt-2">发现 Polis 上最活跃的创作者和打赏者</p>
      </div>

      <div className="flex justify-center gap-2 mb-4">
        <button
          onClick={() => setTab('creators')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            tab === 'creators'
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="h-4 w-4 inline mr-1" />
          创作者
        </button>
        <button
          onClick={() => setTab('tippers')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            tab === 'tippers'
              ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Heart className="h-4 w-4 inline mr-1" />
          打赏榜
        </button>
      </div>

      <div className="flex justify-center gap-1 mb-6">
        {(['weekly', 'monthly', 'all_time'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              period === p
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {p === 'weekly' ? '本周' : p === 'monthly' ? '本月' : '总榜'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      ) : entries.length > 0 ? (
        <div className="glass-card divide-y divide-gray-100 dark:divide-gray-800">
          {entries.map((entry) => (
            <Link
              key={entry.user_id}
              href={`/profile/${entry.username}`}
              className="flex items-center gap-4 px-6 py-4 hover:bg-white/30 dark:hover:bg-white/5 transition-colors"
            >
              <div className="w-8 flex justify-center">
                {rankDisplay(entry.rank)}
              </div>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium">
                {(entry.display_name || entry.username || '?').charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {entry.display_name || entry.username}
                </p>
                <p className="text-xs text-gray-500">@{entry.username}</p>
              </div>
              {tab === 'creators' && typeof entry.total_posts === 'number' && (
                <div className="text-right text-xs text-gray-400 hidden sm:block">
                  <p>{entry.total_posts} 作品</p>
                </div>
              )}
              <div className="text-right">
                <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {entry.score}
                </p>
                <p className="text-xs text-gray-400">{tab === 'creators' ? '积分' : '打赏'}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          暂无排行数据
        </div>
      )}
    </div>
  );
}
