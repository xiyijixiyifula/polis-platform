'use client';

import { useEffect, useState } from 'react';
import { Bookmark, BookOpen, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SavedPage() {
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const router = useRouter();

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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
        <Bookmark className="h-6 w-6 text-primary-600" /> 我的收藏
      </h1>

      {bookmarks.length === 0 ? (
        <div className="card py-16 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">还没有收藏任何内容</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">浏览帖子时点击收藏按钮即可保存</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookmarks.map((b: any) => (
            <div key={b.post_id || b.id} className="card flex items-center gap-3 py-3 px-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors group">
              <Link href={`/post/${b.post_id || b.id}`} className="flex-1 min-w-0 flex items-center gap-3">
                <Bookmark className="h-4 w-4 text-yellow-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{b.post?.title || b.title || '(已删除)'}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">收藏于 {formatDate(b.created_at)}</p>
                </div>
              </Link>
              <button
                onClick={(e) => { e.preventDefault(); removeBookmark(b); }}
                disabled={removingId === (b.post_id || b.id)}
                className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
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
