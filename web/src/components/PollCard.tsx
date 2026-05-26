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
  const [submitting, setSubmitting] = useState(false);
  const [checkingVote, setCheckingVote] = useState(true);

  // On mount, check if current user already voted (refresh persistence)
  useEffect(() => {
    const token = localStorage.getItem('polis_access_token');
    if (!token) {
      setCheckingVote(false);
      return;
    }

    fetch(`/api/polls/${poll.id}/my-vote`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0 && json.data?.voted === true) {
          setVoted(true);
          // Re-fetch server data for accurate counts
          return fetch(`/api/polls/${poll.id}`).then((r) => r.json());
        }
        return null;
      })
      .then((refreshData) => {
        if (refreshData && refreshData.code === 0 && refreshData.data) {
          setResults((prev) => ({
            ...prev,
            options: refreshData.data.options || prev.options,
            total_votes: refreshData.data.total_votes ?? prev.total_votes,
          }));
        }
      })
      .catch(() => {})
      .finally(() => setCheckingVote(false));
  }, [poll.id]);

  const handleVote = async (optionId: string) => {
    const token = localStorage.getItem('polis_access_token');
    if (!token || voted || submitting) return;

    setSubmitting(true);

    try {
      const res = await fetch(`/api/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ option_id: optionId }),
      });
      const data = await res.json();

      if (data.code === 0) {
        // Optimistically update local state for instant visual feedback
        setVoted(true);
        setResults((prev) => ({
          ...prev,
          options: prev.options.map((o) =>
            o.id === optionId ? { ...o, vote_count: o.vote_count + 1 } : o
          ),
          total_votes: prev.total_votes + 1,
        }));

        // Re-fetch from server in background to ensure accuracy
        fetch(`/api/polls/${poll.id}`)
          .then((r) => r.json())
          .then((json) => {
            if (json.code === 0 && json.data) {
              const serverData = json.data;
              setResults((prev) => ({
                ...prev,
                options: serverData.options || prev.options,
                total_votes: serverData.total_votes ?? prev.total_votes,
              }));
            }
          })
          .catch(() => {});
      } else if (data.message && data.message.includes('已经投过票')) {
        // Already voted — mark as voted and re-fetch
        setVoted(true);
        fetch(`/api/polls/${poll.id}`)
          .then((r) => r.json())
          .then((json) => {
            if (json.code === 0 && json.data) {
              const serverData = json.data;
              setResults((prev) => ({
                ...prev,
                options: serverData.options || prev.options,
                total_votes: serverData.total_votes ?? prev.total_votes,
              }));
            }
          })
          .catch(() => {});
      }
    } catch {} finally {
      setSubmitting(false);
    }
  };

  const maxVotes = Math.max(...(Array.isArray(results.options) ? results.options : []).map((o: PollOption) => o.vote_count), 1);

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-primary-600" />
        <h3 className="font-medium text-gray-900 dark:text-gray-100">{results.title}</h3>
        {checkingVote && (
          <span className="text-[10px] text-gray-400 animate-pulse ml-auto">检查投票状态...</span>
        )}
      </div>
      <div className="space-y-2">
        {(Array.isArray(results.options) ? results.options : []).map((opt: PollOption) => {
          const voteCount = opt.vote_count || 0;
          const total = Math.max(results.total_votes || 0, 1);
          const pct = results.total_votes > 0
            ? Math.round((voteCount / total) * 100)
            : 0;
          return (
            <button key={opt.id} onClick={() => handleVote(opt.id)}
              disabled={voted || submitting || checkingVote}
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
