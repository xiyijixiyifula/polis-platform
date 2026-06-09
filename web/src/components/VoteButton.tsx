'use client';

import { getToken } from '@/lib/api';
import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { vote } from '@/lib/api';

interface VoteButtonProps {
  targetType: string;
  targetId: string;
}

export function VoteButton({ targetType, targetId }: VoteButtonProps) {
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [myVote, setMyVote] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vote.getScore(targetType, targetId).then((res) => {
      if (res.code === 0 && res.data) {
        setUpvotes(res.data.upvotes);
        setDownvotes(res.data.downvotes);
        if (res.data.user_vote != null) setMyVote(res.data.user_vote);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [targetType, targetId]);

  const score = upvotes - downvotes;

  const handleVote = async (value: number) => {
    const token = getToken();
    if (!token) return;

    const newValue = myVote === value ? 0 : value;

    if (myVote === 1) setUpvotes((u) => u - 1);
    if (myVote === -1) setDownvotes((d) => d - 1);
    if (newValue === 1) setUpvotes((u) => u + 1);
    if (newValue === -1) setDownvotes((d) => d + 1);
    setMyVote(newValue);

    try {
      const res = await vote.cast(targetType, targetId, newValue);
      if (res.code === 0 && res.data) {
        setUpvotes(res.data.upvotes);
        setDownvotes(res.data.downvotes);
        setMyVote(res.data.user_vote ?? newValue);
      }
    } catch {
      if (myVote === 1) setUpvotes((u) => u + 1);
      if (myVote === -1) setDownvotes((d) => d + 1);
      if (newValue === 1) setUpvotes((u) => u - 1);
      if (newValue === -1) setDownvotes((d) => d - 1);
      setMyVote(myVote);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-0.5 animate-pulse">
        <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-5 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        onClick={() => handleVote(1)}
        title="赞同"
        className={`rounded p-2.5 transition-all duration-150 active:scale-90 min-h-[44px] min-w-[44px] flex items-center justify-center ${
          myVote === 1 ? 'text-primary-600 scale-110' : 'text-gray-300 hover:text-primary-500'
        }`}
      >
        <ChevronUp className="h-5 w-5" />
      </button>
      <span
        className={`text-sm font-bold tabular-nums ${
          score > 0 ? 'text-primary-600' : score < 0 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {score > 0 ? '+' : ''}{score}
      </span>
      <button
        onClick={() => handleVote(-1)}
        title="反对"
        className={`rounded p-2.5 transition-all duration-150 active:scale-90 min-h-[44px] min-w-[44px] flex items-center justify-center ${
          myVote === -1 ? 'text-red-500 scale-110' : 'text-gray-300 hover:text-red-400'
        }`}
      >
        <ChevronDown className="h-5 w-5" />
      </button>
    </div>
  );
}
