'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter } from 'lucide-react';
import { SpaceCard } from '@/components/SpaceCard';
import { spaces } from '@/lib/api';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get('q') || '';
  const [query, setQuery] = useState(q);
  const [activeTab, setActiveTab] = useState<'space' | 'post'>('space');
  const [allSpaces, setAllSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(q);
  }, [q]);

  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        const res = await spaces.trending();
        if (res.data) {
          setAllSpaces(res.data);
        }
      } catch {}
    };
    fetchSpaces();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
    }
  };

  const filteredSpaces = q
    ? allSpaces.filter((s: any) =>
        (s.title && s.title.toLowerCase().includes(q.toLowerCase())) ||
        (s.namespace && s.namespace.toLowerCase().includes(q.toLowerCase())) ||
        (s.description && s.description.toLowerCase().includes(q.toLowerCase()))
      )
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-12 pr-24 text-base shadow-sm placeholder-gray-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            placeholder="搜索社区..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(e); }}
          />
        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-primary-600 hover:bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors">搜索</button>
        </div>
      </form>

      {q && (
        <>
          <div className="mb-4 flex items-center gap-4 text-sm">
            <span className="text-gray-500">搜索结果: &ldquo;{q}&rdquo;</span>
            <span className="text-gray-300">|</span>
            <button onClick={() => setActiveTab('space')} className={`${activeTab === 'space' ? 'text-primary-600 font-medium' : 'text-gray-500'} hover:text-primary-600`}>社区 ({filteredSpaces.length})</button>
          </div>

          {activeTab === 'space' && (
            <div>
              {filteredSpaces.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredSpaces.map((space: any) => (
                    <SpaceCard key={space.id} space={space} />
                  ))}
                </div>
              ) : (
                <div className="card py-12 text-center">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-gray-500">没有找到 &ldquo;{q}&rdquo; 的相关社区</p>
                  <p className="text-sm text-gray-400 mt-1">试试其他关键词</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!q && (
        <div className="card py-12 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-500">输入关键词搜索社区</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">加载中...</div>}>
      <SearchContent />
    </Suspense>
  );
}
