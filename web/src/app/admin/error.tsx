'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Admin Error Boundary]', error);
  }, [error]);

  return (
    <div className="p-8 text-center">
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
        管理后台出错
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-2 max-w-md mx-auto">
        页面渲染时发生了一个错误
      </p>
      {error.digest && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 font-mono">
          错误 ID: {error.digest}
        </p>
      )}
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-w-lg mx-auto">
        {error.message || '未知错误'}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <RefreshCw className="h-4 w-4" />
        重试
      </button>
    </div>
  );
}
