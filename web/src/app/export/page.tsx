'use client';

import { useState } from 'react';
import { Download, FileArchive, Shield } from 'lucide-react';

export default function ExportPage() {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    // In production, POST to /api/spaces/:namespace/export
    await new Promise((r) => setTimeout(r, 2000));
    setExporting(false);
    setExported(true);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="text-center mb-8">
        <Shield className="h-12 w-12 mx-auto text-primary-600 mb-3" />
        <h1 className="text-2xl font-bold text-gray-900">数据导出</h1>
        <p className="text-gray-500 mt-1">你的数据，完全归你。一键导出所有内容。</p>
      </div>

      <div className="card space-y-6">
        <div className="flex items-center gap-4 p-4 rounded-lg bg-green-50 border border-green-200">
          <FileArchive className="h-8 w-8 text-green-600 shrink-0" />
          <div>
            <p className="font-medium text-green-800">数据主权保障</p>
            <p className="text-sm text-green-600">导出包含你的所有帖子、评论、媒体文件，格式为 Markdown + JSON</p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">导出内容</h3>
          <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="rounded border-gray-300" /> 帖子 (Markdown)</label>
          <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="rounded border-gray-300" /> 评论</label>
          <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="rounded border-gray-300" /> 媒体文件</label>
          <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="rounded border-gray-300" /> 社区设置</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="rounded border-gray-300" /> 成员列表</label>
        </div>

        {exported ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-medium text-green-700">导出完成！</p>
            <p className="text-sm text-gray-500 mt-1">文件已生成，请到下载目录查看</p>
            <button className="btn-primary mt-4 gap-2"><Download className="h-4 w-4" /> 下载 ZIP</button>
          </div>
        ) : (
          <button onClick={handleExport} disabled={exporting} className="btn-primary w-full py-3 gap-2">
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
