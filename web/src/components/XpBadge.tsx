'use client';

import { useEffect, useState } from 'react';
import { xp, XpInfo } from '@/lib/api';

export default function XpBadge() {
  const [data, setData] = useState<XpInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    xp.getMyXp()
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data) return null;

  const progress = data.xp_to_next_level > 0
    ? ((data.total_xp / (data.total_xp + data.xp_to_next_level)) * 100)
    : 100;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
        {data.level_icon} Lv.{data.current_level}
      </span>
      <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {data.total_xp} XP
      </span>
    </div>
  );
}
