'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter } from 'lucide-react';
import { SpaceCard } from '@/components/SpaceCard';
import { PostCard } from '@/components/PostCard';
import { search as searchApi } from '@/lib/api';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get('q') || '';
  const tag = searchParams.get('tag') || '';
  const [query, setQuery] = useState(q || tag);
  const [activeTab, setActiveTab] = useState<'space' | 'post' | 'user'>(tag ? 'post' : 'space');
  const [filteredSpaces, setFilteredSpaces] = useState<any[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(q || tag);
  }, [q, tag]);

  useEffect(() => {
    if (!q && !tag) return;
    const fetchResults = async () => {
      setLoading(true);
      try {
        const [spaceRes, postRes, userRes] = await Promise.all([
          tag ? Promise.resolve({ code: -1, data: [] }) : searchApi.spaces(q),
          searchApi.posts(q || undefined, tag || undefined).catch(() => ({ code: -1, data: [] })),
          tag ? Promise.resolve({ code: -1, data: [] }) : searchApi.users(q).catch(() => ({ code: -1, data: [] })),
        ]);
        if (spaceRes.code === 0 && spaceRes.data) {
          setFilteredSpaces(spaceRes.data);
        }
        if (postRes.code === 0 && postRes.data) {
          setFilteredPosts(postRes.data);
        }
        if (userRes.code === 0 && userRes.data) {
          setFilteredUsers(userRes.data);
        }
      } catch (e) { console.error('[Search] fetchResults:', e); }
      setLoading(false);
    };
    fetchResults();
  }, [q, tag]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-12 pr-24 text-base shadow-sm placeholder-gray-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            placeholder="搜索社区、帖子和用户..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(e); }}
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-primary-600 hover:bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors">搜索</button>
        </div>
      </form>

      {(q || tag) && (
        <>
          <div className="mb-4 flex items-center gap-4 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {tag ? <>标签: <span className="text-purple-600 dark:text-purple-400 font-medium">#{tag}</span></> : <>搜索结果: &ldquo;{q}&rdquo;</>}
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button onClick={() => setActiveTab('space')} className={`${activeTab === 'space' ? 'text-primary-600 font-medium' : 'text-gray-500 dark:text-gray-400'} hover:text-primary-600`}>社区 ({filteredSpaces.length})</button>
            <button onClick={() => setActiveTab('post')} className={`${activeTab === 'post' ? 'text-primary-600 font-medium' : 'text-gray-500 dark:text-gray-400'} hover:text-primary-600`}>帖子 ({filteredPosts.length})</button>
            <button onClick={() => setActiveTab('user')} className={`${activeTab === 'user' ? 'text-primary-600 font-medium' : 'text-gray-500 dark:text-gray-400'} hover:text-primary-600`}>用户 ({filteredUsers.length})</button>
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
                  <div className="text-4xl mb-3">{loading ? '⏳' : '🔍'}</div>
                  <p className="text-gray-500 dark:text-gray-400">没有找到 &ldquo;{q}&rdquo; 的相关社区</p>
                  <p className="text-sm text-gray-400 mt-1">试试其他关键词</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'post' && (
            <div>
              {filteredPosts.length > 0 ? (
                <div className="space-y-3">
                  {filteredPosts.map((post: any) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="card py-12 text-center">
                  <div className="text-4xl mb-3">{loading ? '⏳' : '📝'}</div>
                  <p className="text-gray-500 dark:text-gray-400">{tag ? <>没有找到标签 #{tag} 的帖子</> : <>没有找到 &ldquo;{q}&rdquo; 的相关帖子</>}</p>
                  <p className="text-sm text-gray-400 mt-1">试试其他关键词</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'user' && (
            <div>
              {filteredUsers.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredUsers.map((user: any) => (
                    <a
                      key={user.id}
                      href={`/profile/${user.username}`}
                      className="card flex items-center gap-4 p-4 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all group"
                    >
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                        {(user.display_name || user.username).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-900 dark:text-white truncate group-hover:text-primary-600 transition-colors">
                            {user.display_name}
                          </span>
                          {user.verified && (
                            <span className="text-blue-500 text-xs" title="已认证">✓</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          @{user.username}
                        </div>
                        {user.bio && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                            {user.bio}
                          </div>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="card py-12 text-center">
                  <div className="text-4xl mb-3">{loading ? '⏳' : '👤'}</div>
                  <p className="text-gray-500 dark:text-gray-400">没有找到 &ldquo;{q}&rdquo; 的相关用户</p>
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
          <p className="text-gray-500 dark:text-gray-400">输入关键词搜索社区、帖子和用户</p>
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
