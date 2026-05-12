'use client';

import { useEffect, useState } from 'react';
import { Bookmark, BookOpen, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { FeedItem } from '@/components/FeedItem';

export default function SavedPage() {
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = () => {
    const token = localStorage.getItem('polis_access_token');
    fetch('/api/bookmarks', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.code === 0) setBookmarks(d.data || []); })
      .catch(console.error);
  };

  const removeBookmark = async (bookmark: any) => {
    const postId = bookmark.post_id || bookmark.id;
    const namespace = bookmark.space?.namespace || bookmark.space_namespace || '';
    if (!postId || !namespace) return;

    setRemovingId(postId);
    try {
      const token = localStorage.getItem('polis_access_token');
      const res = await fetch(`/api/spaces/${namespace}/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) {
        setBookmarks((prev) => prev.filter((b) => (b.post_id || b.id) !== postId));
      }
    } catch {}
    finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Bookmark className="h-6 w-6 text-primary-600" /> 我的收藏
        </h1>
        {bookmarks.length > 0 && (
          <span className="text-sm text-gray-400 dark:text-gray-500">{bookmarks.length} 条</span>
        )}
      </div>

      {bookmarks.length === 0 ? (
        <div className="glass-card p-6 py-16 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">还没有收藏任何内容</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">浏览帖子时点击收藏按钮即可保存</p>
          <Link href="/" className="text-sm text-primary-600 dark:text-primary-400 hover:underline mt-3 inline-block">去发现内容 →</Link>
        </div>
      ) : (
        <div className="glass-card p-0 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
          {bookmarks.map((b: any) => (
            <div key={b.post_id || b.id} className="relative group">
              <FeedItem item={b} />
              <button
                onClick={() => removeBookmark(b)}
                disabled={removingId === (b.post_id || b.id)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                title="取消收藏"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
