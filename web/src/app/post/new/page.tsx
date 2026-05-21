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
    <Suspense fallback={<div className="p-8 text-center text-gray-500">加载中...</div>}>
      <RedirectInner />
    </Suspense>
  );
}
