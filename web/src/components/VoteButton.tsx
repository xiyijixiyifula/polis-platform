'use client';

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
    const token = localStorage.getItem('polis_access_token');
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
        className={`rounded p-1 transition-colors ${
          myVote === 1 ? 'text-orange-500' : 'text-gray-300 hover:text-orange-500'
        }`}
      >
        <ChevronUp className="h-5 w-5" />
      </button>
      <span
        className={`text-sm font-semibold tabular-nums ${
          score > 0 ? 'text-orange-500' : score < 0 ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {score}
      </span>
      <button
        onClick={() => handleVote(-1)}
        title="反对"
        className={`rounded p-1 transition-colors ${
          myVote === -1 ? 'text-blue-500' : 'text-gray-300 hover:text-blue-500'
        }`}
      >
        <ChevronDown className="h-5 w-5" />
      </button>
    </div>
  );
}
