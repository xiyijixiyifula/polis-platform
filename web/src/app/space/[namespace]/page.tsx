'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PostCard } from '@/components/PostCard';
import { Users, Share2, MessageCircle, Plus, PenLine, UserCheck, BarChart3, Megaphone } from 'lucide-react';
import { formatCount } from '@/lib/utils';
import type { Space, Post } from '@/lib/api';

interface Announcement {
  id: string; title: string; body: string;
  importance: string; is_pinned: boolean;
  created_at: string;
}

export default function SpacePage() {
  const params = useParams();
  const namespace = params.namespace as string;
  const [activeTab, setActiveTab] = useState('posts');
  const [space, setSpace] = useState<Space | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [postLoading, setPostLoading] = useState(true);

  useEffect(() => {
    if (!namespace) return;
    setLoading(true);
    fetch(`/api/spaces/${namespace}`)
      .then(r => r.json())
      .then(data => {
        if (data.code === 0) setSpace(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [namespace]);

  useEffect(() => {
    if (!namespace) return;
    setPostLoading(true);
    Promise.all([
      fetch(`/api/spaces/${namespace}/posts?page_size=20`).then(r => r.json()),
      fetch(`/api/spaces/${namespace}/announcements`).then(r => r.json()),
    ])
      .then(([postsData, annData]) => {
        if (postsData.code === 0) setPosts(postsData.data || []);
        if (annData.code === 0) setAnnouncements(annData.data || []);
      })
      .catch(() => {})
      .finally(() => setPostLoading(false));
  }, [namespace]);

  const tabs = [
    { id: 'posts', label: '帖子', icon: MessageCircle },
    { id: 'members', label: '成员', icon: UserCheck },
    { id: 'polls', label: '投票', icon: BarChart3 },
  ];

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-12 text-center text-gray-400 animate-pulse">加载社区信息...</div>;
  }

  if (!space) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-semibold text-gray-900">社区不存在</h2>
        <p className="mt-2 text-gray-500">未找到社区 "{namespace}"</p>
        <Link href="/explore" className="btn-primary mt-4 inline-block px-6 py-2">浏览其他社区</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="card mb-6">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
            {space.title.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{space.title}</h1>
              {space.is_root && (
                <span className="rounded bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">根社区</span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">/{space.namespace}</p>
            <p className="mt-2 text-sm text-gray-600">{space.description}</p>
            <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {formatCount(space.member_count)} 成员</span>
              <span>{formatCount(space.post_count)} 帖子</span>
              {announcements.length > 0 && (
                <span className="flex items-center gap-1 text-amber-600"><Megaphone className="h-4 w-4" /> {announcements.length} 条公告</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="btn-primary text-sm px-5 py-2" onClick={async () => {
              const token = localStorage.getItem('polis_access_token');
              if (!token) { alert('请先登录'); return; }
              const res = await fetch(`/api/spaces/${namespace}/join`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
              const data = await res.json();
              alert(data.code === 0 ? '已加入社区！' : data.message || '操作失败');
            }}>加入社区</button>
            <button className="btn-secondary p-2"><Share2 className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* Announcements Banner */}
      {announcements.filter(a => a.importance === 'urgent' || a.importance === 'important').length > 0 && (
        <div className="mb-4 space-y-2">
          {announcements.filter(a => a.importance === 'urgent' || a.importance === 'important').map(ann => (
            <div key={ann.id} className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${
              ann.importance === 'urgent'
                ? 'bg-red-50 border-red-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <Megaphone className={`h-5 w-5 mt-0.5 shrink-0 ${
                ann.importance === 'urgent' ? 'text-red-500' : 'text-amber-500'
              }`} />
              <div>
                <p className={`text-sm font-medium ${
                  ann.importance === 'urgent' ? 'text-red-800' : 'text-amber-800'
                }`}>{ann.title}</p>
                <p className={`text-xs mt-0.5 ${
                  ann.importance === 'urgent' ? 'text-red-600' : 'text-amber-600'
                }`}>{ann.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex items-center border-b border-gray-200 gap-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-6">
        <main className="flex-1 max-w-3xl">
          {activeTab === 'posts' && (
            <>
              <Link href={`/post/new?space=${namespace}`}
                className="card flex items-center gap-3 hover:border-primary-300 transition-colors group mb-4">
                <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium text-sm group-hover:scale-105 transition-transform">
                  <PenLine className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">写文章</p>
                  <p className="text-xs text-gray-400">支持 Markdown 语法</p>
                </div>
                <div className="btn-primary text-xs px-4 py-1.5 gap-1">
                  <Plus className="h-3.5 w-3.5" /> 发布
                </div>
              </Link>

              {/* Normal Announcements */}
              {announcements.filter(a => a.importance === 'normal').length > 0 && (
                <div className="mb-4 space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Megaphone className="h-3 w-3" /> 公告
                  </h4>
                  {announcements.filter(a => a.importance === 'normal').map(ann => (
                    <div key={ann.id} className="card py-2.5 px-4">
                      <p className="text-sm font-medium text-gray-900">{ann.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{ann.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {postLoading ? (
                <div className="card py-8 text-center text-gray-400 animate-pulse">加载帖子...</div>
              ) : posts.length > 0 ? (
                <div className="space-y-3">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={{
                      id: post.id,
                      title: post.title,
                      body: post.body,
                      author: post.author,
                      space_id: post.space_id,
                      space_ns: namespace,
                      space_name: space.title,
                      like_count: post.like_count,
                      comment_count: post.comment_count,
                      view_count: post.view_count,
                      created_at: post.created_at,
                      tags: post.tags,
                      is_pinned: post.is_pinned,
                    }} />
                  ))}
                </div>
              ) : (
                <div className="card py-12 text-center text-gray-400">
                  <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>暂无帖子</p>
                  <p className="text-sm mt-1">成为第一个发帖的人吧！</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'polls' && (
            <div className="card py-12 text-center text-gray-400">
              <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>投票功能即将上线</p>
              <p className="text-sm mt-1">社区管理员可以在此发起投票和问卷</p>
            </div>
          )}
        </main>

        <aside className="w-72 shrink-0 hidden xl:block">
          <div className="sticky top-20 space-y-4">
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">关于社区</h3>
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex justify-between"><span>命名空间</span><span className="text-gray-700 font-mono">/{namespace}</span></div>
                <div className="flex justify-between"><span>可见性</span><span className="text-gray-700">{{'public':'公开','private':'私有','unlisted':'不公开'}[space.visibility] || space.visibility}</span></div>
                <div className="flex justify-between"><span>状态</span><span className="text-gray-700">活跃</span></div>
                <div className="flex justify-between"><span>公告</span><span className="text-gray-700">{announcements.length} 条</span></div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
