'use client';

import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { events } from '@/lib/api';

export default function EventCard({ event }: { event: any }) {
  const isActive = event.status === 'active';
  const startDate = new Date(event.start_at || event.start_time || event.created_at);
  const endDate = event.end_at ? new Date(event.end_at) : null;

  return (
    <div className="glass-card p-4 hover:scale-[1.01] transition-transform">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-lg">
          {event.icon || '🎯'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {event.title || event.name}
            </h3>
            {isActive && (
              <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-medium">
                进行中
              </span>
            )}
          </div>
          {event.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
              {event.description}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {startDate.toLocaleDateString('zh-CN')}
              {endDate && ` - ${endDate.toLocaleDateString('zh-CN')}`}
            </span>
            {event.participant_count > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {event.participant_count} 人参与
              </span>
            )}
          </div>
        </div>
      </div>
      {isActive && (
        <Link
          href={`/events/${event.id}`}
          className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700"
        >
          参与活动 <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
