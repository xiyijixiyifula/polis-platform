'use client';

import { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';

interface PollOption {
  id: string;
  label: string;
  vote_count: number;
}

interface PollData {
  id: string;
  title: string;
  description?: string;
  options: PollOption[];
  total_votes: number;
}

interface PollProps {
  poll: PollData;
}

export function PollCard({ poll }: PollProps) {
  const [voted, setVoted] = useState(false);
  const [results, setResults] = useState<PollData>(poll);
  const [fetching, setFetching] = useState(false);

  // Re-fetch poll results from server on mount to ensure data consistency
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      setFetching(true);
      try {
        const res = await fetch(`/api/polls/${poll.id}`);
        const json = await res.json();
        if (json.code === 0 && json.data && !cancelled) {
          setResults(json.data);
        }
      } catch {} finally {
        if (!cancelled) setFetching(false);
      }
    }
    refresh();
    return () => { cancelled = true; };
  }, [poll.id]);

  const handleVote = async (optionId: string) => {
    const token = localStorage.getItem('polis_access_token');
    if (!token || voted) return;

    try {
      const res = await fetch(`/api/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ option_id: optionId }),
      });
      const data = await res.json();

      if (data.code === 0) {
        setVoted(true);
        // Re-fetch from server to get accurate counts
        const refreshRes = await fetch(`/api/polls/${poll.id}`);
        const refreshJson = await refreshRes.json();
        if (refreshJson.code === 0 && refreshJson.data) {
          setResults(refreshJson.data);
        }
      } else if (data.message && data.message.includes('已经投过票')) {
        // Already voted — mark as voted and re-fetch
        setVoted(true);
        const refreshRes = await fetch(`/api/polls/${poll.id}`);
        const refreshJson = await refreshRes.json();
        if (refreshJson.code === 0 && refreshJson.data) {
          setResults(refreshJson.data);
        }
      }
    } catch {}
  };

  const maxVotes = Math.max(...results.options.map((o) => o.vote_count), 1);

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-primary-600" />
        <h3 className="font-medium text-gray-900 dark:text-gray-100">{results.title}</h3>
        {fetching && (
          <span className="text-[10px] text-gray-400 animate-pulse">加载中...</span>
        )}
      </div>
      <div className="space-y-2">
        {results.options.map((opt) => {
          const voteCount = opt.vote_count || 0;
          const total = Math.max(results.total_votes || 0, 1);
          const pct = results.total_votes > 0
            ? Math.round((voteCount / total) * 100)
            : 0;
          return (
            <button key={opt.id} onClick={() => handleVote(opt.id)}
              disabled={voted}
              className="relative w-full rounded-lg border border-gray-200 dark:border-gray-600 p-3 text-left transition-all hover:border-primary-300 dark:hover:border-primary-500 disabled:cursor-default overflow-hidden">
              {/* Progress bar */}
              <div className="absolute inset-0 bg-primary-50 dark:bg-primary-900/20 transition-all duration-300" style={{ width: voted ? `${pct}%` : '0%' }} />
              <div className="relative flex justify-between items-center">
                <span className="text-sm text-gray-700 dark:text-gray-200">{opt.label}</span>
                {voted && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {voteCount} 票 ({pct}%)
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">共 {results.total_votes || 0} 票</p>
    </div>
  );
}
