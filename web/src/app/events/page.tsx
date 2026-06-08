'use client';

import { useEffect, useState } from 'react';
import { Calendar, Loader2, ArrowLeft } from 'lucide-react';
import { events } from '@/lib/api';
import Link from 'next/link';
import EventCard from '@/components/EventCard';

export default function EventsPage() {
  const [eventList, setEventList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    events.list()
      .then(res => { if (res.data) setEventList(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4" />
        返回首页
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
          <Calendar className="h-8 w-8 text-purple-500" />
          社区活动
        </h1>
        <p className="text-gray-500 mt-2">参与社区活动，赢取奖励</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      ) : eventList.length > 0 ? (
        <div className="space-y-4">
          {eventList.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">🎪 暂无进行中的活动</p>
          <p className="text-sm text-gray-400 mt-1">敬请期待即将到来的社区活动</p>
        </div>
      )}
    </div>
  );
}
