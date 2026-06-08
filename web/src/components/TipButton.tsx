'use client';

import { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { tips } from '@/lib/api';

export default function TipButton({ targetId, targetType = 'post', onTipped }: {
  targetId: string;
  targetType?: string;
  onTipped?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [tipped, setTipped] = useState(false);

  const handleTip = async () => {
    setLoading(true);
    try {
      const res = await tips.create({ target_id: targetId, target_type: targetType, amount: 10, is_anonymous: false });
      if (res.code === 0) {
        setTipped(true);
        onTipped?.();
      }
    } catch (e) { console.error('[TipButton] handleTip:', e); } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleTip}
      disabled={loading || tipped}
      className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full transition-all ${
        tipped
          ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400'
          : 'text-gray-400 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20'
      }`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Heart className={`h-3.5 w-3.5 ${tipped ? 'fill-pink-500' : ''}`} />
      )}
      {tipped ? '已打赏' : '打赏'}
    </button>
  );
}
