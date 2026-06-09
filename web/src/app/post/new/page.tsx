'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function RedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const space = searchParams.get('space') || '';
  const module = searchParams.get('module') || '';

  useEffect(() => {
    const params = new URLSearchParams();
    if (space) params.set('space', space);
    if (module) params.set('module', module);
    const qs = params.toString();
    router.replace(`/creations/new${qs ? '?' + qs : ''}`);
  }, [router, space, module]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent mx-auto mb-3" />
        <p className="text-sm text-gray-500">正在跳转到创作者中心...</p>
      </div>
    </div>
  );
}

export default function NewPostPage() {
  return (
    <Suspense fallback={<div className="p-8 animate-pulse space-y-4 max-w-2xl mx-auto"><div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto"></div><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div></div>}>
      <RedirectInner />
    </Suspense>
  );
}
