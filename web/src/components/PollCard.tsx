'use client';

import { useState } from 'react';
import { BarChart3 } from 'lucide-react';

interface PollProps {
  poll: {
    id: string;
    title: string;
    options: { id: string; label: string; vote_count: number }[];
    total_votes: number;
  };
}

export function PollCard({ poll }: PollProps) {
  const [voted, setVoted] = useState(false);
  const [results, setResults] = useState(poll);

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
        setResults((prev) => ({
          ...prev,
          options: prev.options.map((o) =>
            o.id === optionId ? { ...o, vote_count: o.vote_count + 1 } : o
          ),
          total_votes: prev.total_votes + 1,
        }));
      }
    } catch {}
  };

  const maxVotes = Math.max(...results.options.map((o) => o.vote_count), 1);

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-primary-600" />
        <h3 className="font-medium text-gray-900">{results.title}</h3>
      </div>
      <div className="space-y-2">
        {results.options.map((opt) => {
          const pct = Math.round((opt.vote_count / maxVotes) * 100);
          return (
            <button key={opt.id} onClick={() => handleVote(opt.id)}
              disabled={voted}
              className="relative w-full rounded-lg border border-gray-200 p-3 text-left transition-all hover:border-primary-300 disabled:cursor-default overflow-hidden">
              {/* Progress bar */}
              <div className="absolute inset-0 bg-primary-50 transition-all" style={{ width: voted ? `${pct}%` : '0%' }} />
              <div className="relative flex justify-between items-center">
                <span className="text-sm text-gray-700">{opt.label}</span>
                {voted && <span className="text-xs text-gray-500">{opt.vote_count} 票 ({(opt.vote_count / Math.max(results.total_votes, 1) * 100).toFixed(0)}%)</span>}
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-gray-400">共 {results.total_votes} 票</p>
    </div>
  );
}
