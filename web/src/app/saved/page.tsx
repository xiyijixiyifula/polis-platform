'use client';

import { useEffect, useState } from 'react';
import { Bookmark, BookOpen } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function SavedPage() {
  const [bookmarks, setBookmarks] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('polis_access_token');
    fetch('/api/bookmarks', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.code === 0) setBookmarks(d.data || []); })
      .catch(console.error);
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Bookmark className="h-6 w-6 text-primary-600" /> 我的收藏
      </h1>

      {bookmarks.length === 0 ? (
        <div className="card py-16 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">还没有收藏任何内容</p>
          <p className="text-sm text-gray-400 mt-1">浏览帖子时点击收藏按钮即可保存</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookmarks.map((b: any) => (
            <Link key={b.id} href={b.target_type === 'post' ? `/post/${b.target_id}` : '#'}>
              <div className="card flex items-center gap-3 py-3 px-4 hover:border-gray-300 transition-colors">
                <Bookmark className="h-4 w-4 text-yellow-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{b.post?.title || '(已删除)'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">收藏于 {formatDate(b.created_at)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
