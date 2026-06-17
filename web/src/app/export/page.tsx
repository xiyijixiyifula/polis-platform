'use client';

import { useState } from 'react';
import { Download, FileArchive, Shield, AlertCircle } from 'lucide-react';

export default function ExportPage() {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch('/api/users/me/export', {
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      const json = await res.json();
      const data = json.data;
      if (!data) {
        throw new Error('导出数据为空');
      }
      // Trigger JSON file download
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `polis-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExporting(false);
      setExported(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败，请重试');
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="text-center mb-8">
        <Shield className="h-12 w-12 mx-auto text-primary-600 mb-3" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">数据导出</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">你的数据，完全归你。一键导出所有内容。</p>
      </div>

      <div className="card space-y-6">
        <div className="flex items-center gap-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <FileArchive className="h-8 w-8 text-green-600 dark:text-green-400 shrink-0" />
          <div>
            <p className="font-medium text-green-800 dark:text-green-300">数据主权保障</p>
            <p className="text-sm text-green-600 dark:text-green-400">
              导出包含你的个人信息、关注列表、经验日志、徽章、推送订阅、邀请记录等，格式为 JSON
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {exported ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-medium text-green-700 dark:text-green-400">导出完成！</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">JSON 文件已下载到本地</p>
            <button onClick={handleExport} disabled={exporting} className="btn-primary mt-4 gap-2">
              <Download className="h-4 w-4" /> 再次导出
            </button>
          </div>
        ) : (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-primary w-full py-3 gap-2"
          >
            {exporting ? (
              <>⏳ 正在打包你的数据...</>
            ) : (
              <><Download className="h-4 w-4" /> 导出我的数据</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
