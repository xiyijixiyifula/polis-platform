'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PostCard } from '@/components/PostCard';
import { SpaceCard } from '@/components/SpaceCard';
import { Settings, Calendar, Users, UserCheck, Heart, Bookmark, MessageCircle, Repeat2, Eye } from 'lucide-react';
import { users, posts, follow, type User, type FollowUser } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface StoredUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  verified: boolean;
  created_at: string;
}

// Feed 风格卡片（用于收藏/点赞）
function FeedItem({ item }: { item: any }) {
  const author = item.author || {};
  const space = item.space || {};
  const authorUsername = author.username || '';
  const authorDisplayName = author.display_name || authorUsername || '用户';
  const spaceNs = space.namespace || '';
  const spaceName = space.title || spaceNs;

  const getItemLink = () => {
    const base = '/post/' + item.id;
    if (spaceNs) return base + '?space=' + encodeURIComponent(spaceNs);
    return base;
  };

  const likeCount = item.like_count || 0;
  const commentCount = item.comment_count || 0;
  const viewCount = item.view_count || 0;

  return (
    <Link href={getItemLink()} className="block px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
      {/* Line 1: @author/community/module / title */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1 flex-wrap">
        <Link href={'/profile/' + authorUsername} className="font-semibold text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 truncate max-w-[130px]">
          @{authorUsername}
        </Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <Link href={spaceNs ? '/space/' + spaceNs : '#'} className="text-primary-600 dark:text-primary-400 hover:underline truncate max-w-[140px]">
          {spaceName}
        </Link>
        <span className="text-gray-300 dark:text-gray-600 mx-0.5">/</span>
        <span className="text-gray-900 dark:text-white font-semibold truncate">
          {item.title || '无标题'}
        </span>
      </div>

      {/* Line 2: Preview */}
      {item.preview && (
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 pl-5">
          {item.preview}
        </p>
      )}

      {/* Line 3: Social stats */}
      <div className="flex items-center gap-5 pl-5 mt-1 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Heart className="h-3.5 w-3.5" />
          <span>{likeCount}</span>
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" />
          <span>{commentCount}</span>
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <Eye className="h-3.5 w-3.5" />
          <span>{viewCount}</span>
        </span>
      </div>
    </Link>
  );
}

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

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [userSpaces, setUserSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('spaces');
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [followingList, setFollowingList] = useState<FollowUser[]>([]);
  const [listLoading, setListLoading] = useState(false);
  // 收藏 & 点赞
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<any[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
  const [likedLoading, setLikedLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('polis_user');
    if (!stored) {
      router.push('/login');
      return;
    }
    try {
      const u = JSON.parse(stored) as StoredUser;
      setUser(u);
    } catch {
      router.push('/login');
      return;
    }
  }, [router]);

  const getAuthHeaders = useCallback(() => ({
    Authorization: 'Bearer ' + (localStorage.getItem('polis_access_token') || ''),
    'Content-Type': 'application/json',
  }), []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    (async () => {
      try {
        const res = await users.getProfile(user.username);
        if (res.data) setProfile(res.data);
      } catch {}

      try {
        const spacesRes = await fetch('/api/users/' + user.username + '/spaces', {
          headers: getAuthHeaders(),
        });
        const spacesData = await spacesRes.json();
        if (spacesData.code === 0 && spacesData.data) {
          const allSpaces: any[] = spacesData.data;
          const ownedSpaces = allSpaces.filter((s: any) =>
            s.namespace?.startsWith(user.username + '/')
          );
          setUserSpaces(ownedSpaces);
        }
      } catch {}

      // Load follow counts
      try {
        const fRes = await follow.followers(user.username);
        if (fRes.code === 0 && fRes.data) setFollowerCount(fRes.data.length);
      } catch {}
      try {
        const fgRes = await follow.following(user.username);
        if (fgRes.code === 0 && fgRes.data) setFollowingCount(fgRes.data.length);
      } catch {}

      setLoading(false);
    })();
  }, [user, getAuthHeaders]);

  // 加载收藏
  useEffect(() => {
    if (!user) return;
    setBookmarksLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/bookmarks', { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.code === 0 && data.data) setBookmarks(data.data);
      } catch {}
      setBookmarksLoading(false);
    })();
  }, [user, getAuthHeaders]);

  // 加载点赞
  useEffect(() => {
    if (!user) return;
    setLikedLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/liked-posts', { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.code === 0 && data.data) setLikedPosts(data.data);
      } catch {}
      setLikedLoading(false);
    })();
  }, [user, getAuthHeaders]);

  const loadFollowers = async () => {
    if (!user) return;
    setListLoading(true);
    try {
      const res = await follow.followers(user.username);
      if (res.code === 0 && res.data) setFollowers(res.data);
    } catch {}
    setListLoading(false);
    setActiveTab('followers');
  };

  const loadFollowing = async () => {
    if (!user) return;
    setListLoading(true);
    try {
      const res = await follow.following(user.username);
      if (res.code === 0 && res.data) setFollowingList(res.data);
    } catch {}
    setListLoading(false);
    setActiveTab('following');
  };

  if (!user) return null;

  const displayUser = profile || user;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="h-20 w-20 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-3xl">
            {displayUser.display_name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{displayUser.display_name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">@{displayUser.username}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/settings" className="btn-secondary text-sm px-4 py-1.5">
                  <Settings className="h-4 w-4 mr-1 inline" />
                  编辑资料
                </Link>
              </div>
            </div>
            {displayUser.bio && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{displayUser.bio}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(displayUser.created_at)} 加入
              </span>
              <button onClick={loadFollowers} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">
                <Users className="h-3.5 w-3.5" />
                <span className="font-semibold text-gray-700 dark:text-gray-300">{followerCount}</span> 粉丝
              </button>
              <button onClick={loadFollowing} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{followingCount}</span> 关注
              </button>
              {displayUser.verified && (
                <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-medium">✓ 已认证</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 mb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-0 overflow-x-auto">
          {['spaces', 'bookmarks', 'likes', 'followers', 'following'].map((tab) => (
            <button key={tab} onClick={() => {
              setActiveTab(tab);
              if (tab === 'followers') loadFollowers();
              if (tab === 'following') loadFollowing();
            }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              {{spaces: `社区 (${userSpaces.length})`, bookmarks: `收藏 (${bookmarks.length})`, likes: `点赞 (${likedPosts.length})`, followers: `粉丝 (${followerCount})`, following: `关注 (${followingCount})`}[tab]}
            </button>
          ))}
        </div>
      </div>


      {activeTab === 'bookmarks' && (
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

      {activeTab === 'likes' && (
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

      {activeTab === 'spaces' && (
        <div>
          {userSpaces.length > 0 ? (
            <div className="space-y-3">
              {userSpaces.map((sp: any) => (
                <SpaceCard key={sp.id || sp.namespace} space={{
                  id: sp.id,
                  namespace: sp.namespace,
                  title: sp.title,
                  description: sp.description || '',
                  icon_url: sp.icon_url || null,
                  member_count: sp.member_count || 0,
                  post_count: sp.post_count || 0,
                  is_root: sp.is_root || false,
                  owner_id: sp.owner_id || null,
                }} />
              ))}
            </div>
          ) : (
            <div className="card py-12 text-center text-gray-500 dark:text-gray-400">
              <div className="text-3xl mb-2">🏛️</div>
              <p className="text-sm">还没有创建社区</p>
              <Link href="/create" className="mt-2 inline-block text-sm text-primary-600 dark:text-primary-400 hover:underline">
                创建你的第一个社区 →
              </Link>
            </div>
          )}
        </div>
      )}

      {activeTab === 'followers' && (
        <FollowList users={followers} loading={listLoading} emptyText="暂无粉丝" />
      )}

      {activeTab === 'following' && (
        <FollowList users={followingList} loading={listLoading} emptyText="还没有关注任何人" />
      )}
    </div>
  );
}
