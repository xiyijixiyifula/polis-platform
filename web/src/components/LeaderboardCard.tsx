'use client';

import { useEffect, useState } from 'react';
import { Trophy, Medal, Crown } from 'lucide-react';
import { leaderboard, tips, LeaderboardEntry } from '@/lib/api';
import Link from 'next/link';

export default function LeaderboardCard({ type = 'creators' }: { type?: 'creators' | 'tippers' }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'all_time'>('weekly');

  useEffect(() => {
    const fetcher = type === 'creators' ? leaderboard.get : tips.getLeaderboard;
    fetcher(period)
      .then(res => { if (res.data) setEntries(res.data.slice(0, 5)); })
      .catch(() => {});
  }, [period, type]);

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-4 w-4 text-amber-400" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
    if (rank === 3) return <Medal className="h-4 w-4 text-amber-700" />;
    return <span className="text-xs font-bold text-gray-400 w-4 text-center">{rank}</span>;
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          {type === 'creators' ? '创作者榜' : '打赏榜'}
        </h3>
        <div className="flex gap-1 text-xs">
          {(['weekly', 'monthly', 'all_time'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-1 rounded-full transition-colors ${
                period === p
                  ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 font-medium'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {p === 'weekly' ? '周' : p === 'monthly' ? '月' : '总'}
            </button>
          ))}
        </div>
      </div>

      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Link
              key={entry.user_id}
              href={`/profile/${entry.username}`}
              className="flex items-center gap-3 px-2 py-2 hover:bg-white/30 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              <div className="w-6 flex justify-center">{rankIcon(entry.rank)}</div>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-medium shrink-0">
                {(entry.display_name || entry.username || '?').charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {entry.display_name || entry.username}
                </p>
                <p className="text-xs text-gray-500">@{entry.username}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary-600 dark:text-primary-400">
                  {entry.score}
                </p>
                <p className="text-xs text-gray-400">
                  {type === 'creators' ? '积分' : '打赏'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-gray-400 py-4">暂无数据</p>
      )}

      <Link
        href="/leaderboard"
        className="block text-center text-sm text-primary-600 dark:text-primary-400 hover:underline mt-3 pt-2 border-t border-gray-100 dark:border-gray-800"
      >
        查看完整排行
      </Link>
    </div>
  );
}
