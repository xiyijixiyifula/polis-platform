'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, UserPlus, Users, UserCheck, MessageSquare, Heart, Bookmark, LogOut, PenLine, Trash2, Eye, MessageCircle, Video, Globe, Lock, Key, ThumbsUp } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { getModuleLabel, normalizeModuleType } from '@/lib/module-config';
import { users, follow, videos, type User, type FollowUser, type VideoItem } from '@/lib/api';
import { SpaceCard } from '@/components/SpaceCard';
import { FeedItem } from '@/components/FeedItem';
import ContentCard, { adaptFeedItem } from '@/components/ContentCard';
import CreationCard from '@/components/CreationCard';

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
          className="glass-card flex items-center gap-3 py-3 px-4 hover:border-white/50 dark:hover:border-white/20 transition-colors">
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

  // isSelf-only tabs: community | works | private | bookmarks | likes
  const [activeTab, setActiveTab] = useState('community');
  const [communitySubTab, setCommunitySubTab] = useState<'owned' | 'joined'>('owned');
  const [myContents, setMyContents] = useState<any[]>([]);
  const [contentsLoading, setContentsLoading] = useState(false);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<any[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
  const [likedLoading, setLikedLoading] = useState(false);

  // Works tab (creations + module sub-tabs)
  const [myCreations, setMyCreations] = useState<any[]>([]);
  const [creationsLoading, setCreationsLoading] = useState(false);
  const [worksSubTab, setWorksSubTab] = useState('overview');

  // Video states
  const [myVideos, setMyVideos] = useState<VideoItem[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [showVideoEdit, setShowVideoEdit] = useState<string | null>(null);
  const [editVis, setEditVis] = useState('');
  const [editPwd, setEditPwd] = useState('');
  const [editPublishing, setEditPublishing] = useState(false);

  // 视频管理
  const handleDeleteVideo = async (videoId: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('确定要删除这个视频吗？此操作不可撤销。')) return;
    try {
      const res = await videos.delete(videoId);
      if (res.code === 0) setMyVideos(prev => prev.filter(v => v.id !== videoId));
      else alert(res.message || '删除失败');
    } catch { alert('删除失败'); }
  };

  const handleUpdateVideoVis = async (videoId: string, visibility: string) => {
    try {
      const res = await videos.update(videoId, { visibility });
      if (res.code === 0) setMyVideos(prev => prev.map(v => v.id === videoId ? { ...v, visibility } : v));
      else alert(res.message || '更新失败');
    } catch { alert('更新失败'); }
    setShowVideoEdit(null);
  };

  const handleSetPassword = async (videoId: string) => {
    if (!editPwd.trim()) { alert('请输入密码'); return; }
    setEditPublishing(true);
    try {
      const res = await videos.setPassword(videoId, editPwd.trim());
      if (res.code === 0) {
        setMyVideos(prev => prev.map(v => v.id === videoId ? { ...v, has_password: true } : v));
        setEditPwd('');
        setShowVideoEdit(null);
      } else alert(res.message || '设置失败');
    } catch { alert('设置失败'); }
    setEditPublishing(false);
  };

  // 投稿引用状态
  const [showRefDialog, setShowRefDialog] = useState(false);
  const [refPostId, setRefPostId] = useState('');
  const [refIsCreation, setRefIsCreation] = useState(false);
  const [refPostModuleType, setRefPostModuleType] = useState('forum'); // 源帖子的模块类型
  const [refSpaceNs, setRefSpaceNs] = useState('');
  const [refModuleType, setRefModuleType] = useState('forum');
  const [refSubmitting, setRefSubmitting] = useState(false);
  const [refError, setRefError] = useState('');
  const [refSuccess, setRefSuccess] = useState('');
  // 用户搜索 & 社区列表
  const [refUserQuery, setRefUserQuery] = useState('');
  const [refUserResults, setRefUserResults] = useState<any[]>([]);
  const [refUserLoading, setRefUserLoading] = useState(false);
  const [refSelectedUser, setRefSelectedUser] = useState<any>(null);
  const [refUserSpaces, setRefUserSpaces] = useState<any[]>([]);
  const [refSpacesLoading, setRefSpacesLoading] = useState(false);
  const [refShowUserDropdown, setRefShowUserDropdown] = useState(false);

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

  // isSelf: 加载视频
  useEffect(() => {
    if (!isSelf) return;
    setVideosLoading(true);
    (async () => {
      try {
        const res = await videos.myVideos(1, 50);
        if (res.code === 0 && res.data) setMyVideos(Array.isArray(res.data) ? res.data : []);
      } catch {}
      setVideosLoading(false);
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

  // isSelf: 加载作品（creations + submissions）
  useEffect(() => {
    if (!isSelf) return;
    setCreationsLoading(true);
    (async () => {
      try {
        const token = localStorage.getItem('polis_access_token');
        const res = await fetch('/api/creations?page=1&page_size=50', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.data) setMyCreations(Array.isArray(data.data) ? data.data : []);
      } catch {}
      setCreationsLoading(false);
    })();
  }, [isSelf, username]);

  // 非自己：加载公开作品
  useEffect(() => {
    if (isSelf || !username) return;
    setCreationsLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/creations?creator_username=${encodeURIComponent(username)}&page_size=50`);
        const data = await res.json();
        if (data.code === 0 && data.data) {
          setMyCreations(Array.isArray(data.data) ? data.data : []);
        }
      } catch {}
      setCreationsLoading(false);
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

  // 搜索用户（用户名模糊匹配）
  const handleSearchUsers = async (query: string) => {
    setRefUserQuery(query);
    setRefSelectedUser(null);
    setRefUserSpaces([]);
    setRefSpaceNs('');
    if (!query.trim()) { setRefUserResults([]); return; }
    setRefUserLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}&limit=8`);
      const data = await res.json();
      if (data.code === 0 && Array.isArray(data.data)) {
        setRefUserResults(data.data);
        setRefShowUserDropdown(true);
      }
    } catch {}
    setRefUserLoading(false);
  };

  // 选择用户后加载其社区列表
  const handleSelectUser = async (user: any) => {
    setRefSelectedUser(user);
    setRefUserQuery(user.username);
    setRefShowUserDropdown(false);
    setRefUserResults([]);
    setRefSpaceNs('');
    setRefSpacesLoading(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(user.username)}/spaces`);
      const data = await res.json();
      if (data.code === 0 && Array.isArray(data.data)) {
        // 过滤：只显示启用了相同模块类型的社区
        const filtered = data.data.filter((s: any) => {
          const mods = s.enabled_modules;
          if (!mods || !Array.isArray(mods)) return refPostModuleType === 'forum';
          return mods.includes(refPostModuleType);
        });
        setRefUserSpaces(filtered);
      }
    } catch {}
    setRefSpacesLoading(false);
  };

  // 投稿引用
  const handleSubmitReference = async () => {
    if (!refSpaceNs.trim()) { setRefError('请选择目标社区'); return; }
    setRefSubmitting(true);
    setRefError('');
    setRefSuccess('');
    try {
      let apiPath: string;
      let body: string;
      if (refIsCreation) {
        apiPath = '/api/creations/' + refPostId + '/submit';
        body = JSON.stringify({ creation_id: refPostId, space_ns: refSpaceNs.trim(), module_type: refModuleType });
      } else {
        apiPath = '/api/posts/' + refPostId + '/reference';
        body = JSON.stringify({ space_ns: refSpaceNs.trim(), module_type: refModuleType });
      }
      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (localStorage.getItem('polis_access_token') || '') },
        body,
      });
      const data = await res.json();
      if (data.code === 0) {
        setRefSuccess('投稿已提交，等待社区所有者审核');
        setTimeout(() => { setShowRefDialog(false); setRefSuccess(''); }, 2000);
      } else {
        setRefError(data.message || '投稿失败');
      }
    } catch {
      setRefError('网络错误');
    }
    setRefSubmitting(false);
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
      if (process.env.NODE_ENV === 'development') if (process.env.NODE_ENV === 'development') console.error('Follow toggle failed:', e);
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
        <div className="glass-card p-6 animate-pulse space-y-4">
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
      <div className="glass-card p-6">
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
                  <Link href="/creations" className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium transition-all bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-600/20">
                    <PenLine className="h-4 w-4" /> 创作者中心
                  </Link>
                  <Link href="/creations/new" className="btn-secondary text-sm px-4 py-1.5 flex items-center gap-1">
                    投稿
                  </Link>
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
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3.5 w-3.5" />
                <span className="font-semibold text-gray-700 dark:text-gray-300">{user.total_likes || 0}</span> 获赞
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
        <div className="mt-4 glass-card p-4">
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
        <div className="mt-4 glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> 关注 ({followingCount})
            </h3>
            <button onClick={() => setShowFollowing(false)} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">关闭</button>
          </div>
          <FollowList users={followingList} loading={listLoading} emptyText="还没有关注任何人" />
        </div>
      )}

      {/* 选项卡（自己：全部；他人：社区+作品） */}
      <div className="mt-6 mb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-0 overflow-x-auto">
          {isSelf ? (
            <>
              {(['community', 'works', 'private', 'bookmarks', 'likes'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}>
                  {{community: `社区 (${userSpaces.length})`, works: `作品 (${myCreations.length})`, private: `私密作品 (${myCreations.filter(c => c.visibility === 'private').length})`, bookmarks: `收藏 (${bookmarks.length})`, likes: `点赞 (${likedPosts.length})`}[tab]}
                </button>
              ))}
            </>
          ) : (
            <>
              {(['community', 'works'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}>
                  {{community: `社区 (${userSpaces.length})`, works: `作品 (${myCreations.length})`}[tab]}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* isSelf: 收藏 Tab */}
      {isSelf && activeTab === 'bookmarks' && (
        bookmarksLoading ? (
          <div className="glass-card p-6 py-12 text-center text-gray-500 dark:text-gray-400">加载中...</div>
        ) : bookmarks.length > 0 ? (
          <div className="glass-card p-0 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
            {bookmarks.map((item: any) => (
              <FeedItem key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="glass-card p-6 py-12 text-center text-gray-500 dark:text-gray-400">
            <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">还没有收藏过帖子</p>
          </div>
        )
      )}

      {/* isSelf: 点赞 Tab */}
      {isSelf && activeTab === 'likes' && (
        likedLoading ? (
          <div className="glass-card p-6 py-12 text-center text-gray-500 dark:text-gray-400">加载中...</div>
        ) : likedPosts.length > 0 ? (
          <div className="glass-card p-0 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
            {likedPosts.map((item: any) => (
              <FeedItem key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="glass-card p-6 py-12 text-center text-gray-500 dark:text-gray-400">
            <Heart className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">还没有点赞过帖子</p>
          </div>
        )
      )}
      {/* 作品 Tab — 公开可见 */}
      {activeTab === 'works' && (
        <>
          {/* 模块子选项卡 — 按作品实际模块类型分类 */}
          {(() => {
            // 规范化模块类型并收集实际出现的模块
            const ntype = (c: any) => normalizeModuleType(c.submissions?.[0]?.module_type || c.content_type);
            const modules = new Set<string>();
            myCreations.forEach((c: any) => modules.add(ntype(c)));
            const moduleList = Array.from(modules);
            if (moduleList.length === 0) return null;
            const allTabs = ['overview', ...moduleList];
            return (
              <div className="flex gap-0 mb-4 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
                {allTabs.map((tab) => (
                  <button key={tab} onClick={() => setWorksSubTab(tab)}
                    className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                      worksSubTab === tab
                        ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}>
                    {tab === 'overview' ? '概览' : getModuleLabel(tab)}
                    {' '}
                    ({tab === 'overview'
                      ? myCreations.length
                      : myCreations.filter((c: any) => ntype(c) === tab).length})
                  </button>
                ))}
              </div>
            );
          })()}

          {creationsLoading ? (
            <div className="glass-card p-6 py-12 text-center text-gray-500 dark:text-gray-400">加载中...</div>
          ) : (() => {
            const ntype = (c: any) => normalizeModuleType(c.submissions?.[0]?.module_type || c.content_type);
            const filtered = myCreations.filter((c: any) => {
              if (worksSubTab === 'overview') return true;
              return ntype(c) === worksSubTab;
            });
            if (filtered.length === 0) return (
              <div className="glass-card p-6 py-12 text-center text-gray-500 dark:text-gray-400">
                <PenLine className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">该模块还没有作品</p>
              </div>
            );
            return (
              <div className="space-y-2">
                {filtered.map((creation: any) => (
                  <CreationCard
                    key={creation.id}
                    creation={creation}
                    isOwner={false}
                    showSubmissionsOnly={true}
                  />
                ))}
              </div>
            );
          })()}

          {myCreations.length === 0 && !creationsLoading && (
            <div className="glass-card p-6 py-12 text-center text-gray-500 dark:text-gray-400">
              <PenLine className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{isSelf ? '还没有发布过作品' : '暂无公开作品'}</p>
              {isSelf && (
                <Link href="/creations/new" className="text-sm text-primary-600 hover:underline mt-1 inline-block">去创作第一篇</Link>
              )}
            </div>
          )}
        </>
      )}

      {/* isSelf: 私密作品 Tab */}
      {isSelf && activeTab === 'private' && (
        creationsLoading ? (
          <div className="glass-card p-6 py-12 text-center text-gray-500 dark:text-gray-400">加载中...</div>
        ) : (() => {
          const privateWorks = myCreations.filter((c: any) => c.visibility === 'private');
          if (privateWorks.length === 0) return (
            <div className="glass-card p-6 py-12 text-center text-gray-500 dark:text-gray-400">
              <Lock className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">没有私密作品</p>
            </div>
          );
          return (
            <div className="space-y-2">
              {privateWorks.map((creation: any) => (
                <CreationCard
                  key={creation.id}
                  creation={creation}
                  isOwner={false}
                />
              ))}
            </div>
          );
        })()
      )}


      {/* 社区列表（自己：Tab模式；他人：直接显示） */}
      {activeTab === 'community' && (
        <div className="mt-6">
          {/* isSelf: 社区子选项卡 [我创建的] [我加入的] */}
          {isSelf && ownedSpaces.length > 0 && joinedSpaces.length > 0 && (
            <div className="flex gap-0 mb-4 border-b border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setCommunitySubTab('owned')}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                  communitySubTab === 'owned'
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                我创建的 ({ownedSpaces.length})
              </button>
              <button
                onClick={() => setCommunitySubTab('joined')}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                  communitySubTab === 'joined'
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                我加入的 ({joinedSpaces.length})
              </button>
            </div>
          )}

          {/* 创建的社区 */}
          {(!isSelf || communitySubTab === 'owned') && ownedSpaces.length > 0 && (
            <div className="mb-6">
              {!isSelf && (
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide flex items-center gap-2">
                  {user.display_name} 创建的社区 ({ownedSpaces.length})
                </h3>
              )}
              <div className="space-y-3">
                {ownedSpaces.map((sp: any) => (
                  <SpaceCard key={sp.id || sp.namespace} space={spaceCardData(sp)} />
                ))}
              </div>
            </div>
          )}

          {/* 加入的社区 */}
          {(!isSelf || communitySubTab === 'joined') && joinedSpaces.length > 0 && (
            <div className="mb-6">
              {!isSelf && (
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide flex items-center gap-2">
                  {user.display_name} 加入的社区 ({joinedSpaces.length})
                </h3>
              )}
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
            <div className="glass-card p-6 py-12 text-center text-gray-500 dark:text-gray-400">
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

      {/* 投稿引用弹窗 — 优化版：用户搜索 + 社区下拉 + 模块限制 */}
      {showRefDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowRefDialog(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">📬 投稿到其他社区</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              将内容引用投放到目标社区。模块限制：
              <span className="px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium text-xs ml-1">
                {refPostModuleType === 'qa' ? '问答' : refPostModuleType === 'share' ? '分享' : refPostModuleType === 'wiki' ? '知识库' : refPostModuleType === 'novel' ? '小说' : refPostModuleType === 'game' ? '游戏' : refPostModuleType === 'mini_app' ? '小程序' : '交流'}
              </span>
              &nbsp;仅可投稿到同模块社区
            </p>

            {/* Step 1: 搜索用户 */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">搜索创作者</label>
                <div className="relative">
                  <input type="text" value={refUserQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    onFocus={() => { if (refUserResults.length > 0) setRefShowUserDropdown(true); }}
                    onBlur={() => setTimeout(() => setRefShowUserDropdown(false), 200)}
                    placeholder="输入用户名搜索..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                  {refUserLoading && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">搜索中...</span>
                  )}
                  {/* 用户下拉列表 */}
                  {refShowUserDropdown && refUserResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg max-h-48 overflow-y-auto">
                      {refUserResults.map((u: any) => (
                        <button key={u.id} type="button"
                          onMouseDown={() => handleSelectUser(u)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 text-xs font-bold shrink-0">
                            {(u.display_name || u.username || '?').charAt(0)}
                          </span>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white truncate">{u.display_name || u.username}</div>
                            <div className="text-xs text-gray-400">@{u.username}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {refSelectedUser && (
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                    ✓ 已选择：{refSelectedUser.display_name || refSelectedUser.username} (@{refSelectedUser.username})
                  </p>
                )}
              </div>

              {/* Step 2: 选择目标社区（仅显示同模块社区） */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">目标社区</label>
                {refSpacesLoading ? (
                  <p className="text-xs text-gray-400">加载社区列表...</p>
                ) : refSelectedUser && refUserSpaces.length === 0 ? (
                  <div className="px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {refSelectedUser.username} 暂无「
                      {refPostModuleType === 'qa' ? '问答' : refPostModuleType === 'share' ? '分享' : refPostModuleType === 'wiki' ? '知识库' : refPostModuleType === 'novel' ? '小说' : refPostModuleType === 'game' ? '游戏' : refPostModuleType === 'mini_app' ? '小程序' : '交流'}
                      」模块的社区
                    </p>
                  </div>
                ) : refUserSpaces.length > 0 ? (
                  <select value={refSpaceNs} onChange={(e) => setRefSpaceNs(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none">
                    <option value="">-- 选择社区 --</option>
                    {refUserSpaces.map((s: any) => (
                      <option key={s.id || s.namespace} value={s.namespace}>
                        {s.title || s.namespace} ({s.namespace})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-gray-400">请先搜索并选择创作者</p>
                )}
              </div>

              {/* 模块类型（锁定，不可更改） */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  目标模块 <span className="text-amber-500">（锁定为源帖模块）</span>
                </label>
                <input type="text" readOnly
                  value={refPostModuleType === 'qa' ? '问答 (qa)' : refPostModuleType === 'share' ? '分享 (share)' : refPostModuleType === 'wiki' ? '知识库 (wiki)' : refPostModuleType === 'novel' ? '小说 (novel)' : refPostModuleType === 'game' ? '游戏 (game)' : refPostModuleType === 'mini_app' ? '小程序 (mini_app)' : '交流 (forum)'}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed outline-none" />
              </div>

              {refError && <p className="text-xs text-red-500">{refError}</p>}
              {refSuccess && <p className="text-xs text-green-500">{refSuccess}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button onClick={() => setShowRefDialog(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">取消</button>
              <button onClick={handleSubmitReference} disabled={refSubmitting || !refSpaceNs.trim()}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {refSubmitting ? '提交中...' : '投稿'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
