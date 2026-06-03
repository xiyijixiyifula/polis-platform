'use client';

import { useEffect, useState } from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import { weeklyTopic } from '@/lib/api';
import Link from 'next/link';

export default function WeeklyTopicBanner() {
  const [topic, setTopic] = useState<any>(null);

  useEffect(() => {
    weeklyTopic.getActive()
      .then(res => { if (res.data) setTopic(res.data); })
      .catch(() => {});
  }, []);

  if (!topic) return null;

  return (
    <div className="mx-4 mb-4 p-4 rounded-xl bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 border border-primary-100 dark:border-primary-800">
      <div className="flex items-center gap-2 mb-1">
        <Calendar className="h-4 w-4 text-primary-500" />
        <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
          本周话题
        </span>
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
        {topic.title}
      </h3>
      {topic.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
          {topic.description}
        </p>
      )}
      <Link
        href={`/hashtag/${encodeURIComponent(topic.topic_key || topic.title)}`}
        className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700"
      >
        查看全部投稿 <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
