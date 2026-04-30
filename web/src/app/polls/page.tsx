'use client';

import Link from 'next/link';
import { BarChart3, ArrowRight } from 'lucide-react';

export default function PollsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">投票中心</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
        投票功能嵌套在社区内，前往你感兴趣的社区参与或发起投票。
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/explore" className="btn-primary px-6 py-2.5 inline-flex items-center gap-2 justify-center">
          浏览社区 <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/polls/new" className="btn-secondary px-6 py-2.5 inline-flex items-center gap-2 justify-center">
          发起投票
        </Link>
      </div>
    </div>
  );
}
