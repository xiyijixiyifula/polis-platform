'use client'
import { getToken } from '@/lib/api';

import { useEffect, useState } from 'react';
import { FileText, Trash2, Edit3 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<any[]>([]);

  useEffect(() => {
    const token = getToken();
    fetch('/api/drafts', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.code === 0) setDrafts(d.data || []); })
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <FileText className="h-6 w-6 text-gray-400" /> 草稿箱
      </h1>

      {drafts.length === 0 ? (
        <div className="card py-16 text-center">
          <FileText className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">📝 暂无草稿</p>
          <p className="text-sm text-gray-400 mt-1">在发帖时点击"保存草稿"即可保存</p>
        </div>
      ) : (
        <div className="space-y-2">
          {drafts.map((d: any) => (
            <Link key={d.id} href={`/creations/new?draft=${d.id}`}>
              <div className="card flex items-center gap-3 py-3 px-4 hover:border-gray-300 transition-colors">
                <Edit3 className="h-4 w-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{d.title || '(无标题)'}</p>
                  <p className="text-xs text-gray-400">{d.body?.slice(0, 60) || '空内容'} · {formatDate(d.updated_at)}</p>
                </div>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{d.module_type}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
