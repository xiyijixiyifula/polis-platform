'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, UserPlus, Users, UserCheck, MessageSquare, Heart, Bookmark, LogOut, PenLine, Trash2, Eye, MessageCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { users, follow, type User, type FollowUser } from '@/lib/api';
import { SpaceCard } from '@/components/SpaceCard';
import { FeedItem } from '@/components/FeedItem';

function FollowList({ users: list, loading, emptyText }: {
  users: FollowUser[];
  loading: boolean;
  emptyText: string;
}) {
  if (loading) return <div className="text-center py-8 text-gray-500 dark:text-gray-400">加载中...</div>;
  if (list.length === 0) return <div className="text-center py-8 text-gray-500 dark:text-gray-400">{emptyText}</div>;
  return (
    <div className="space-y-2">
      {list.map((u: FollowUser) => (
        <Link key={u.id} href={`/profile/${u.username}`}
          className="card flex items-center gap-3 py-3 px-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm">
            {u.display_name?.charAt(0) || '?'}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{u.display_name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">@{u.username}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const [user, setUser] = useState<User | null>(null);
  const [userSpaces, setUserSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [followingList, setFollowingList] = useState<FollowUser[]>([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [isSelf, setIsSelf] = useState(false);

  // isSelf-only tabs: spaces | posts | bookmarks | likes
  const [activeTab, setActiveTab] = useState('spaces');
  const [myContents, setMyContents] = useState<any[]>([]);
  const [contentsLoading, setContentsLoading] = useState(false);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<any[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
  const [likedLoading, setLikedLoading] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('polis_access_token');
    return {
      Authorization: token ? 'Bearer ' + token : '',
      'Content-Type': 'application/json',
    };
  };

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setUser(null);
    setUserSpaces([]);
    setError('');
    (async () => {
      try {
        const res = await users.getProfile(username);
        if (res.code === 0 && res.data) {
          setUser(res.data);
          const stored = localStorage.getItem('polis_user');
          if (stored) {
            try {
              const me = JSON.parse(stored);
              setIsSelf(me.username === username || me.id === res.data.id);
            } catch {}
          }
        } else {
          setError('用户不存在');
        }
      } catch {
        setError('加载失败');
      }

      try {
        const token = localStorage.getItem('polis_access_token');
        const spRes = await fetch('/api/users/' + username + '/spaces', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const spData = await spRes.json();
        if (spData.code === 0 && spData.data) {
          setUserSpaces(spData.data);
        }
      } catch {}

      await loadFollowCounts();
      setLoading(false);
    })();
  }, [username]);

  // isSelf: 加载收藏
  useEffect(() => {
    if (!isSelf) return;
    setBookmarksLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/bookmarks', { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.code === 0 && data.data) setBookmarks(data.data);
      } catch {}
      setBookmarksLoading(false);
    })();
  }, [isSelf, username]);

  // isSelf: 加载点赞
  useEffect(() => {
    if (!isSelf) return;
    setLikedLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/liked-posts', { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.code === 0 && data.data) setLikedPosts(data.data);
      } catch {}
      setLikedLoading(false);
    })();
  }, [isSelf, username]);

  // isSelf: 加载创作内容（我的帖子 — 预加载以显示准确计数）
  useEffect(() => {
    if (!isSelf) return;
    setContentsLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/my/contents?page=1&page_size=50', { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.code === 0 && data.data?.items) setMyContents(data.data.items);
      } catch {}
      setContentsLoading(false);
    })();
  }, [isSelf, username]);

  // 删除自己的帖子
  const handleDeletePost = async (postId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('确定要删除这篇帖子吗？此操作不可撤销。')) return;
    try {
      const res = await fetch('/api/posts/' + postId, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + (localStorage.getItem('polis_access_token') || '') },
      });
      const data = await res.json();
      if (data.code === 0) {
        setMyContents(prev => prev.filter((p: any) => p.id !== postId));
      } else {
        alert(data.message || '删除失败');
      }
    } catch {
      alert('删除失败');
    }
  };

  const loadFollowCounts = async () => {
    try {
      const fRes = await follow.followers(username);
      if (fRes.code === 0 && fRes.data) setFollowerCount(fRes.data.length);
    } catch {}
    try {
      const fgRes = await follow.following(username);
      if (fgRes.code === 0 && fgRes.data) setFollowingCount(fgRes.data.length);
    } catch {}
  };

  const loadFollowers = async () => {
    if (showFollowers) { setShowFollowers(false); return; }
    setShowFollowing(false);
    setListLoading(true);
    try {
      const res = await follow.followers(username);
      if (res.code === 0 && res.data) setFollowers(res.data);
    } catch {}
    setListLoading(false);
    setShowFollowers(true);
  };

  const loadFollowing = async () => {
    if (showFollowing) { setShowFollowing(false); return; }
    setShowFollowers(false);
    setListLoading(true);
    try {
      const res = await follow.following(username);
      if (res.code === 0 && res.data) setFollowingList(res.data);
    } catch {}
    setListLoading(false);
    setShowFollowing(true);
  };

  const handleFollow = async () => {
    if (!user || !user.id) return;
    const token = localStorage.getItem('polis_access_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    setFollowLoading(true);
    try {
      const res = await follow.toggle('user', user.id);
      if (res.code === 0) {
        const nowFollowing = res.data ?? false;
        setIsFollowing(nowFollowing);
        setFollowerCount(prev => nowFollowing ? prev + 1 : Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error('Follow toggle failed:', e);
    }
    setFollowLoading(false);
  };

  // 退出社区
  const handleLeaveSpace = async (namespace: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('确定要退出这个社区吗？')) return;
    try {
      const res = await fetch('/api/spaces/' + encodeURIComponent(namespace) + '/leave', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + (localStorage.getItem('polis_access_token') || '') },
      });
      const data = await res.json();
      if (data.code === 0) {
        setUserSpaces(prev => prev.filter((s: any) => s.namespace !== namespace));
      } else {
        alert(data.message || '操作失败');
      }
    } catch (e: any) {
      alert(e?.message || '操作失败');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="card animate-pulse space-y-4">
          <div className="h-20 w-20 bg-gray-200 rounded-full" />
          <div className="h-6 w-1/3 bg-gray-200 rounded" />
          <div className="h-4 w-1/2 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center">
        <div className="text-4xl mb-4">😕</div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{error || '用户不存在'}</h2>
        <Link href="/" className="text-sm text-primary-600 hover:underline">返回首页</Link>
      </div>
    );
  }

  // 分离拥有的社区和加入的社区（通过 owner_id 精确区分）
  const ownedSpaces = userSpaces.filter((sp: any) => {
    if (sp.owner_id && user?.id) return sp.owner_id === user.id;
    // 兼容旧数据：无 owner_id 时回退到 namespace 前缀匹配
    return sp.namespace?.startsWith(username + '/');
  });
  const joinedSpaces = userSpaces.filter((sp: any) => {
    if (sp.owner_id && user?.id) return sp.owner_id !== user.id;
    return !sp.namespace?.startsWith(username + '/');
  });

  const spaceCardData = (sp: any) => ({
    id: sp.id,
    namespace: sp.namespace,
    title: sp.title,
    description: sp.description || '',
    icon_url: sp.icon_url || null,
    member_count: sp.member_count || 0,
    post_count: sp.post_count || 0,
    is_root: sp.is_root || false,
    owner_id: sp.owner_id || null,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* 用户信息卡片 */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="h-20 w-20 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-3xl">
            {user.display_name?.charAt(0) || '?'}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.display_name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
              </div>
              {!isSelf && (
                <div className="flex items-center gap-2">
                  <Link
                    href={`/messages/${user.id}`}
                    className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium transition-all bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    <MessageSquare className="h-4 w-4" /> 私信
                  </Link>
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`inline-flex items-center gap-1.5 text-sm px-5 py-2 rounded-lg font-medium transition-all ${
                      isFollowing
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400'
                        : 'btn-primary'
                    }`}
                  >
                    {followLoading ? (
                      <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : isFollowing ? (
                      <><UserCheck className="h-4 w-4" /> 已关注</>
                    ) : (
                      <><UserPlus className="h-4 w-4" /> 关注</>
                    )}
                  </button>
                </div>
              )}
              {isSelf && (
                <div className="flex items-center gap-2">
                  <Link href="/settings" className="btn-secondary text-sm px-4 py-1.5">
                    编辑资料
                  </Link>
                </div>
              )}
            </div>
            {user.bio && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{user.bio}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(user.created_at)} 加入
              </span>
              <button onClick={loadFollowers} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">
                <Users className="h-3.5 w-3.5" />
                <span className="font-semibold text-gray-700 dark:text-gray-300">{followerCount}</span> 粉丝
              </button>
              <button onClick={loadFollowing} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{followingCount}</span> 关注
              </button>
              {user.verified && (
                <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-medium">✓ 已认证</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 粉丝/关注列表 */}
      {showFollowers && (
        <div className="mt-4 card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="h-4 w-4" /> 粉丝 ({followerCount})
            </h3>
            <button onClick={() => setShowFollowers(false)} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">关闭</button>
          </div>
          <FollowList users={followers} loading={listLoading} emptyText="暂无粉丝" />
        </div>
      )}

      {showFollowing && (
        <div className="mt-4 card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> 关注 ({followingCount})
            </h3>
            <button onClick={() => setShowFollowing(false)} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">关闭</button>
          </div>
          <FollowList users={followingList} loading={listLoading} emptyText="还没有关注任何人" />
        </div>
      )}

      {/* isSelf: 选项卡 */}
      {isSelf && (
        <div className="mt-6 mb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-0 overflow-x-auto">
            {(['spaces', 'posts', 'bookmarks', 'likes'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}>
                {{spaces: `社区 (${userSpaces.length})`, posts: `创作 (${myContents.length})`, bookmarks: `收藏 (${bookmarks.length})`, likes: `点赞 (${likedPosts.length})`}[tab]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* isSelf: 收藏 Tab */}
      {isSelf && activeTab === 'bookmarks' && (
        bookmarksLoading ? (
          <div className="card py-12 text-center text-gray-500 dark:text-gray-400">加载中...</div>
        ) : bookmarks.length > 0 ? (
          <div className="card divide-y divide-gray-100 dark:divide-gray-800">
            {bookmarks.map((item: any) => (
              <FeedItem key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="card py-12 text-center text-gray-500 dark:text-gray-400">
            <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">还没有收藏过帖子</p>
          </div>
        )
      )}

      {/* isSelf: 点赞 Tab */}
      {isSelf && activeTab === 'likes' && (
        likedLoading ? (
          <div className="card py-12 text-center text-gray-500 dark:text-gray-400">加载中...</div>
        ) : likedPosts.length > 0 ? (
          <div className="card divide-y divide-gray-100 dark:divide-gray-800">
            {likedPosts.map((item: any) => (
              <FeedItem key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="card py-12 text-center text-gray-500 dark:text-gray-400">
            <Heart className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">还没有点赞过帖子</p>
          </div>
        )
      )}

      {/* isSelf: 创作 Tab — 自己发布的所有内容 */}
      {isSelf && activeTab === 'posts' && (
        contentsLoading ? (
          <div className="card py-12 text-center text-gray-500 dark:text-gray-400">加载中...</div>
        ) : myContents.length > 0 ? (
          <div className="space-y-2">
            {myContents.map((post: any) => {
              const space = post.space || {};
              const spaceNs = space.namespace || '';
              const moduleLabel = post.module_type === 'share' ? '分享' : post.module_type === 'wiki' ? '知识库' : post.module_type === 'qa' ? '问答' : post.module_type === 'novel' ? '小说' : post.module_type === 'game' ? '游戏' : post.module_type === 'mini_app' ? '小程序' : '交流';
              return (
                <div key={post.id} className="card p-4 group hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* 去路：社区 → 模块 */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-1.5 flex-wrap">
                        <span className="text-gray-300 dark:text-gray-600">📬</span>
                        <Link href={spaceNs ? `/space/${encodeURIComponent(spaceNs)}` : '#'}
                          className="font-medium text-primary-600 dark:text-primary-400 hover:underline truncate max-w-[160px]">
                          {space.title || spaceNs || '未知社区'}
                        </Link>
                        <span className="text-gray-300 dark:text-gray-600">›</span>
                        <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs text-gray-600 dark:text-gray-400">{moduleLabel}</span>
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <span>{formatDate(post.created_at)}</span>
                      </div>
                      <Link href={`/post/${post.id}${spaceNs ? '?space=' + encodeURIComponent(spaceNs) : ''}`}>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1">
                          {post.title || '无标题'}
                        </h3>
                      </Link>
                      {post.body && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                          {post.body.replace(/<[^>]+>/g, '').slice(0, 200)}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{post.like_count || 0}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{post.comment_count || 0}</span>
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.view_count || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link href={`/post/${post.id}${spaceNs ? '?space=' + encodeURIComponent(spaceNs) : ''}`}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-primary-600 transition-colors"
                        title="编辑">
                        <PenLine className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={(e) => handleDeletePost(post.id, e)}
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                        title="删除">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card py-12 text-center text-gray-500 dark:text-gray-400">
            <PenLine className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">还没有发布过内容</p>
            <Link href="/post/new" className="text-sm text-primary-600 hover:underline mt-1 inline-block">去发布第一篇</Link>
          </div>
        )
      )}

      {/* 社区列表（自己：Tab模式；他人：直接显示） */}
      {(isSelf ? activeTab === 'spaces' : true) && (
        <div className="mt-6">
          {/* 创建的社区 */}
          {ownedSpaces.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide flex items-center gap-2">
                {isSelf ? '我创建的社区' : `${user.display_name} 创建的社区`} ({ownedSpaces.length})
              </h3>
              <div className="space-y-3">
                {ownedSpaces.map((sp: any) => (
                  <SpaceCard key={sp.id || sp.namespace} space={spaceCardData(sp)} />
                ))}
              </div>
            </div>
          )}

          {/* 加入的社区 */}
          {joinedSpaces.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide flex items-center gap-2">
                {isSelf ? '我加入的社区' : `${user.display_name} 加入的社区`} ({joinedSpaces.length})
              </h3>
              <div className="space-y-3">
                {joinedSpaces.map((sp: any) => (
                  <div key={sp.id || sp.namespace} className="flex items-center gap-2 group">
                    <div className="flex-1">
                      <SpaceCard space={spaceCardData(sp)} />
                    </div>
                    {isSelf && (
                      <button
                        onClick={(e) => handleLeaveSpace(sp.namespace, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 inline-flex items-center gap-1 text-xs px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium"
                        title="退出社区"
                      >
                        <LogOut className="h-3.5 w-3.5" /> 退出
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 空状态 */}
          {userSpaces.length === 0 && (
            <div className="card py-12 text-center text-gray-500 dark:text-gray-400">
              {isSelf ? (
                <>
                  <div className="text-3xl mb-2">🏛️</div>
                  <p className="text-sm">还没有加入任何社区</p>
                  <Link href="/create" className="mt-2 inline-block text-sm text-primary-600 dark:text-primary-400 hover:underline">
                    创建你的第一个社区 →
                  </Link>
                </>
              ) : (
                <p className="text-sm">该用户还没有加入任何社区</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
