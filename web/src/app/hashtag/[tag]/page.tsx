'use client';

import { useEffect, useState } from 'react';
import { Hash, Loader2, ArrowLeft } from 'lucide-react';
import { hashtags } from '@/lib/api';
import Link from 'next/link';
import ContentCard, { adaptFeedItem } from '@/components/ContentCard';

export default function HashtagPage({ params }: { params: { tag: string } }) {
  const decodedTag = decodeURIComponent(params.tag);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    hashtags.getPosts(decodedTag, { page: 1, page_size: 50 })
      .then(res => {
        if (res.data?.items) setPosts(res.data.items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [decodedTag]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4" />
        返回首页
      </Link>

      <div className="flex items-center gap-2 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <Hash className="h-5 w-5 text-primary-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">#{decodedTag}</h1>
          <p className="text-sm text-gray-500">{posts.length} 篇内容</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((item: any) => {
            const props = adaptFeedItem(item);
            return <ContentCard key={item.id} {...props} />;
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">🏷️ 暂无此话题的内容</p>
          <p className="text-sm text-gray-400 mt-1">快来发布第一个使用 #{decodedTag} 的内容吧</p>
        </div>
      )}
    </div>
  );
}
