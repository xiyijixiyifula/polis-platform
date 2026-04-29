'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface VoteButtonProps {
  targetType: string;
  targetId: string;
  initialUpvotes?: number;
  initialDownvotes?: number;
}

export function VoteButton({ targetType, targetId, initialUpvotes = 0, initialDownvotes = 0 }: VoteButtonProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [myVote, setMyVote] = useState(0); // 1 = up, -1 = down, 0 = none

  const score = upvotes - downvotes;

  const handleVote = async (value: number) => {
    const token = localStorage.getItem('polis_access_token');
    if (!token) return;

    const newValue = myVote === value ? 0 : value;
    const oldValue = myVote;

    // Optimistic update
    if (myVote === 1) setUpvotes((u) => u - 1);
    if (myVote === -1) setDownvotes((d) => d - 1);
    if (newValue === 1) setUpvotes((u) => u + 1);
    if (newValue === -1) setDownvotes((d) => d + 1);
    setMyVote(newValue);

    try {
      await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target_type: targetType, target_id: targetId, value: newValue }),
      });
    } catch {
      // Rollback on error
      setUpvotes(initialUpvotes);
      setDownvotes(initialDownvotes);
      setMyVote(0);
    }
  };

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button onClick={() => handleVote(1)}
        className={`rounded p-1 transition-colors ${myVote === 1 ? 'text-primary-600' : 'text-gray-300 hover:text-primary-500'}`}>
        <ChevronUp className="h-5 w-5" />
      </button>
      <span className={`text-sm font-medium tabular-nums ${score > 0 ? 'text-primary-600' : score < 0 ? 'text-red-500' : 'text-gray-500'}`}>
        {score}
      </span>
      <button onClick={() => handleVote(-1)}
        className={`rounded p-1 transition-colors ${myVote === -1 ? 'text-red-500' : 'text-gray-300 hover:text-red-500'}`}>
        <ChevronDown className="h-5 w-5" />
      </button>
    </div>
  );
}
