'use client';

import { useEffect, useState, use } from 'react';
import { Calendar, User, Users, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { events } from '@/lib/api';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    events.list()
      .then(res => {
        if (res.data) {
          const found = res.data.find((e: any) => e.id === id);
          if (found) setEvent(found);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await events.join(id);
      if (res.code === 0) setJoined(true);
    } catch {} finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20 text-gray-400">
        活动不存在
      </div>
    );
  }

  const startDate = new Date(event.start_at || event.start_time || event.created_at);
  const endDate = event.end_at ? new Date(event.end_at) : null;
  const isActive = event.status === 'active';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/events" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" />
        返回活动列表
      </Link>

      <div className="glass-card p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-500 text-white text-2xl mb-4">
            {event.icon || '🎯'}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {event.title || event.name}
          </h1>
          {isActive ? (
            <span className="inline-block px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm font-medium">
              进行中
            </span>
          ) : (
            <span className="inline-block px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 text-sm">
              已结束
            </span>
          )}
        </div>

        <div className="space-y-3 mb-6 text-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>
              {startDate.toLocaleDateString('zh-CN')}
              {endDate && ` — ${endDate.toLocaleDateString('zh-CN')}`}
            </span>
          </div>
          {event.participant_count > 0 && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Users className="h-4 w-4 shrink-0" />
              <span>{event.participant_count} 人已参与</span>
            </div>
          )}
          {event.creator && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <User className="h-4 w-4 shrink-0" />
              <span>由 {event.creator.display_name || event.creator.username} 发起</span>
            </div>
          )}
        </div>

        {event.description && (
          <div className="prose dark:prose-invert max-w-none mb-6">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{event.description}</p>
          </div>
        )}

        {isActive && (
          <div className="text-center">
            {joined ? (
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium">
                <CheckCircle className="h-5 w-5" />
                已参与
              </div>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="btn-primary px-8 py-3 rounded-full text-sm font-medium disabled:opacity-50"
              >
                {joining ? '处理中...' : '立即参与'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
