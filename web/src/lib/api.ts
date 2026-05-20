const API_BASE = '/api';

/** 在 API 路径中安全编码 namespace：将 / 替换为 ~ 以避免 Next.js 拦截 %2F */
function encodeNs(ns: string): string {
  return ns.replace(/\//g, '~');
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T | null;
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  verified: boolean;
  created_at: string;
}

export interface Series {
  id: string;
  space_id: string;
  author: User;
  title: string;
  description: string;
  cover_url: string | null;
  visibility: string;
  is_published: boolean;
  post_count: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Space {
  id: string;
  namespace: string;
  slug: string;
  owner_id: string | null;
  is_root: boolean;
  root_space_id: string | null;
  title: string;
  description: string;
  icon_url: string | null;
  banner_url: string | null;
  visibility: 'public' | 'private' | 'unlisted';
  status: 'active' | 'archived' | 'suspended';
  member_count: number;
  post_count: number;
  enabled_modules?: string[];
  created_at: string;
}

export interface Post {
  id: string;
  space_id: string;
  space_ns?: string;
  module_type: string;
  author: User | null;
  author_id?: string;
  title: string;
  body: string;
  content_type: string;
  tags: string[];
  media_urls?: string[];
  visibility?: string;
  is_pinned: boolean;
  is_featured: boolean;
  is_deleted?: boolean;
  view_count: number;
  like_count: number;
  comment_count: number;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  is_hidden?: boolean;
  has_password?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostCardData {
  id: string;
  title: string;
  body: string;
  author: { username: string; display_name: string; avatar_url: string | null };
  space_id: string;
  space_ns: string;
  space_name: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  created_at: string;
  tags?: string[];
  is_pinned?: boolean;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

const spaceNsCache: Record<string, string> = {};
export async function resolveSpaceNs(spaceId: string): Promise<string> {
  if (spaceNsCache[spaceId]) return spaceNsCache[spaceId];
  try {
    const res = await fetch(`${API_BASE}/spaces/trending`);
    if (res.ok) {
      const data = await res.json();
      if (data.code === 0 && Array.isArray(data.data)) {
        const space = data.data.find((s: any) => s.id === spaceId);
        if (space?.namespace) {
          spaceNsCache[spaceId] = space.namespace;
          return space.namespace;
        }
      }
    }
  } catch {}
  try {
    const res = await fetch(`${API_BASE}/spaces/${spaceId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.code === 0 && data.data?.namespace) {
        spaceNsCache[spaceId] = data.data.namespace;
        return data.data.namespace;
      }
    }
  } catch {}
  return spaceId;
}

let accessToken: string | null = null;

export function setToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem('polis_access_token', token);
  } else {
    localStorage.removeItem('polis_access_token');
  }
}

export function getToken(): string | null {
  if (!accessToken) {
    accessToken = localStorage.getItem('polis_access_token');
  }
  return accessToken;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  // FormData 会自带 multipart boundary，不能覆盖 Content-Type
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Auto-logout on expired/invalid token (401 Unauthorized)
  if (response.status === 401) {
    setToken(null);
    // Redirect to login, preserving current URL for return after login
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?redirect=${redirect}`;
    }
    throw new Error('登录已过期，请重新登录');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

export const auth = {
  register: (data: { username: string; display_name: string; email: string; password: string }) =>
    request<LoginResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
};

export interface FollowUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export const users = {
  getProfile: (username: string) => request<User>(`/users/${username}`),

  updateProfile: (data: { display_name?: string; avatar_url?: string; bio?: string }) =>
    request<User>('/users/me', { method: 'PUT', body: JSON.stringify(data) }),

  toggleFollow: (followeeType: string, followeeId: string) =>
    request<boolean>('/follow', {
      method: 'POST',
      body: JSON.stringify({ followee_type: followeeType, followee_id: followeeId }),
    }),

  getFollowers: (username: string) =>
    request<FollowUser[]>(`/users/${username}/followers`),

  getFollowing: (username: string) =>
    request<FollowUser[]>(`/users/${username}/following`),
};

export const follow = {
  toggle: (followeeType: string, followeeId: string) =>
    request<boolean>('/follow', {
      method: 'POST',
      body: JSON.stringify({ followee_type: followeeType, followee_id: followeeId }),
    }),

  followers: (username: string) =>
    request<FollowUser[]>(`/users/${username}/followers`),

  following: (username: string) =>
    request<FollowUser[]>(`/users/${username}/following`),
};

export const spaces = {
  create: (data: { slug: string; title: string; description?: string; visibility?: string }) =>
    request<Space>('/spaces', { method: 'POST', body: JSON.stringify(data) }),

  get: (namespace: string) => request<Space>(`/spaces/${encodeNs(namespace)}`),

  update: (namespace: string, data: { title?: string; description?: string; enabled_modules?: string[]; visibility?: string; password?: string }) =>
    request<Space>(`/spaces/${encodeNs(namespace)}`, { method: 'PUT', body: JSON.stringify(data) }),

  join: (namespace: string, message?: string) =>
    request<{ status: string; message: string }>(`/spaces/${encodeNs(namespace)}/join`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  leave: (namespace: string) =>
    request<void>(`/spaces/${encodeNs(namespace)}/leave`, { method: 'POST' }),

  trending: () => request<Space[]>('/spaces/trending'),

  members: (namespace: string) => request<SpaceMember[]>('/spaces/' + namespace + '/members'),

  /** 封禁成员 */
  banMember: (namespace: string, userId: string) =>
    request<void>(`/spaces/${encodeNs(namespace)}/members/ban`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),

  /** 设置成员角色 */
  setMemberRole: (namespace: string, userId: string, role: string) =>
    request<void>(`/spaces/${encodeNs(namespace)}/members/role`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role }),
    }),

  /** 获取加入申请列表 */
  joinRequests: (namespace: string) =>
    request<Array<{ user_id: string; username: string; display_name: string; status: string; message: string | null; created_at: string }>>(`/spaces/${encodeNs(namespace)}/join-requests`),

  /** 审批加入申请 */
  reviewJoinRequest: (namespace: string, userId: string, approved: boolean) =>
    request<{ status: string; message: string }>(`/spaces/${encodeNs(namespace)}/join-requests/review`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, approved }),
    }),
};

export interface SpaceMember {
  user: User;
  role: string;
  joined_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  author: User | null;
  parent_id: string | null;
  body: string;
  like_count: number;
  created_at: string;
}

export const search = {
  spaces: (q: string, pageSize?: number) => {
    const params = new URLSearchParams({ q });
    if (pageSize) params.set('page_size', String(pageSize));
    return request<Space[]>('/search?' + params.toString());
  },
  /** 搜索帖子（支持关键词和标签） */
  posts: (q?: string, tag?: string, pageSize?: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (tag) params.set('tag', tag);
    if (pageSize) params.set('page_size', String(pageSize));
    return request<Post[]>('/posts/search?' + params.toString());
  },
  /** 搜索用户 */
  users: (q: string, limit?: number) => {
    const params = new URLSearchParams({ q });
    if (limit) params.set('limit', String(limit));
    return request<User[]>('/users/search?' + params.toString());
  },
};


export interface SpaceTier {
  id: string;
  space_id: string;
  name: string;
  price_cents: number;
  currency: string;
  description: string;
  benefits: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  space_id: string;
  user_id: string;
  tier_id: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

export const tiers = {
  /** 获取空间的会员等级列表 */
  list: (namespace: string) =>
    request<SpaceTier[]>(`/tiers/space/${encodeNs(namespace)}`),

  /** 创建会员等级 */
  create: (namespace: string, data: { name: string; price_cents: number; description?: string; benefits?: string[] }) =>
    request<{id: string}>(`/tiers/space/${encodeNs(namespace)}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** 更新会员等级 */
  update: (namespace: string, tierId: string, data: { name?: string; price_cents?: number; description?: string; benefits?: string[]; is_active?: boolean }) =>
    request<void>(`/tiers/${tierId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** 删除会员等级 */
  delete: (namespace: string, tierId: string) =>
    request<void>(`/tiers/${tierId}`, { method: 'DELETE' }),
};

export const subscribe = {
  /** 订阅付费会员 */
  join: (namespace: string, tierId: string) =>
    request<{id: string}>(`/subscribe/space/${encodeNs(namespace)}`, {
      method: 'POST',
      body: JSON.stringify({ tier_id: tierId }),
    }),

  /** 取消订阅 */
  cancel: (namespace: string) =>
    request<void>(`/subscribe/space/${encodeNs(namespace)}`, { method: 'DELETE' }),

  /** 获取当前用户订阅状态 */
  get: (namespace: string) =>
    request<Subscription | null>(`/subscribe/space/${encodeNs(namespace)}`),
};

export const series = {
  /** 创建系列（专栏） */
  create: (namespace: string, data: { title: string; description?: string; cover_url?: string; visibility?: string }) =>
    request<{id: string}>(`/series/space/${encodeNs(namespace)}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** 获取空间的系列列表 */
  list: (namespace: string) =>
    request<Series[]>(`/series/space/${encodeNs(namespace)}`),

  /** 获取系列详情（含帖子列表） */
  get: (id: string) =>
    request<{series: Series; posts: Post[]}>(`/series/${id}`),

  /** 更新系列 */
  update: (id: string, data: { title?: string; description?: string; cover_url?: string; visibility?: string; is_published?: boolean; sort_order?: number }) =>
    request<void>(`/series/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** 删除系列 */
  delete: (id: string) =>
    request<void>(`/series/${id}`, { method: 'DELETE' }),

  /** 添加帖子到系列 */
  addPost: (seriesId: string, postId: string, sortOrder?: number) =>
    request<void>(`/series/${seriesId}/posts`, {
      method: 'POST',
      body: JSON.stringify({ post_id: postId, sort_order: sortOrder || 0 }),
    }),

  /** 从系列移除帖子 */
  removePost: (seriesId: string, postId: string) =>
    request<void>(`/series/${seriesId}/posts/${postId}`, { method: 'DELETE' }),
};

export const posts = {
  create: (namespace: string, data: { title: string; body: string; module_type?: string; tags?: string[]; visibility?: string; password?: string }) =>
    request<Post>(`/spaces/${encodeNs(namespace)}/posts`, {
      method: 'POST',
      body: JSON.stringify({ ...data, content_type: 'text', module_type: data.module_type || 'forum' }),
    }),

  list: (namespace: string, params?: { page?: number; page_size?: number; module?: string; sort?: string }) => {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.page_size) search.set('page_size', String(params.page_size));
    if (params?.module) search.set('module', params.module);
    if (params?.sort) search.set('sort', params.sort);
    const qs = search.toString();
    return request<Post[]>(`/spaces/${encodeNs(namespace)}/posts${qs ? `?${qs}` : ''}`);
  },

  get: (namespace: string, id: string) => request<Post>(`/spaces/${encodeNs(namespace)}/posts/${id}`),

  getById: async (id: string): Promise<{ post: Post; spaceNs: string } | null> => {
    try {
      const data = await request<Post>(`/posts/${id}`);
      if (data.code === 0 && data.data) {
        const post = data.data;
        // 优先使用后端直接返回的 space_ns，避免额外空间查询
        const spaceNs = post.space_ns || await resolveSpaceNs(post.space_id);
        return { post, spaceNs };
      }
    } catch {}
    return null;
  },

  getComments: (namespace: string, postId: string) =>
    request<Comment[]>(`/spaces/${encodeNs(namespace)}/posts/${postId}/comments`),

  getCommentsById: (postId: string) =>
    request<Comment[]>(`/posts/${postId}/comments`),

  createComment: (namespace: string, postId: string, body: string, parentId?: string) =>
    request<Comment>(`/spaces/${encodeNs(namespace)}/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body, ...(parentId ? { parent_id: parentId } : {}) }),
    }),

  /** 直接通过帖子ID评论（无需namespace，v0.3.22 RESTful 别名） */
  createCommentById: (postId: string, body: string, parentId?: string) =>
    request<Comment>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body, ...(parentId ? { parent_id: parentId } : {}) }),
    }),

  likeComment: (commentId: string) =>
    request<boolean>(`/comments/${commentId}/like`, { method: 'POST' }),

  like: (namespace: string, id: string) =>
    request<boolean>(`/spaces/${encodeNs(namespace)}/posts/${id}/like`, { method: 'POST' }),

  /** 直接通过帖子ID点赞（无需namespace，v0.3.22 RESTful 别名） */
  likeById: (id: string) =>
    request<{ liked: boolean; post_id: string }>(`/posts/${id}/like`, { method: 'POST' }),

  bookmark: (namespace: string, id: string) =>
    request<boolean>(`/spaces/${encodeNs(namespace)}/posts/${id}/bookmark`, { method: 'POST' }),

  /** 直接通过帖子ID收藏（无需namespace，v0.3.22 RESTful 别名） */
  bookmarkById: (id: string) =>
    request<{ bookmarked: boolean; post_id: string }>(`/posts/${id}/bookmark`, { method: 'POST' }),

  report: (namespace: string, id: string, reason: string) =>
    request<void>(`/spaces/${encodeNs(namespace)}/posts/${id}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  /** 直接通过帖子ID举报（无需namespace） */
  reportById: (id: string, reason: string) =>
    request<{ report_id: string; message: string }>(`/posts/${id}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  pin: (namespace: string, id: string) =>
    request<{ pinned: boolean }>(`/spaces/${encodeNs(namespace)}/posts/${id}/pin`, { method: 'POST' }),

  feature: (namespace: string, id: string) =>
    request<{ featured: boolean }>(`/spaces/${encodeNs(namespace)}/posts/${id}/featured`, { method: 'POST' }),

  hide: (namespace: string, id: string) =>
    request<{ hidden: boolean }>(`/spaces/${encodeNs(namespace)}/posts/${id}/hide`, { method: 'POST' }),

  view: (id: string) =>
    request<{ view_count: number }>(`/posts/${id}/view`, { method: 'POST' }),

  update: (namespace: string, id: string, data: { title?: string; body?: string; tags?: string[]; visibility?: string; password?: string }) =>
    request<Post>(`/spaces/${encodeNs(namespace)}/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** 解锁密码保护的帖子 */
  unlock: (id: string, password: string) =>
    request<Post>(`/posts/${id}/unlock`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  delete: (namespace: string, id: string) =>
    request<void>(`/spaces/${encodeNs(namespace)}/posts/${id}`, { method: 'DELETE' }),
};

export interface VoteScore {
  target_type: string;
  target_id: string;
  upvotes: number;
  downvotes: number;
  score: number;
  user_vote?: number;
}

export const vote = {
  getScore: (targetType: string, targetId: string) =>
    request<VoteScore>(`/vote?target_type=${encodeURIComponent(targetType)}&target_id=${encodeURIComponent(targetId)}`),

  cast: (targetType: string, targetId: string, value: number) =>
    request<VoteScore>('/vote', {
      method: 'POST',
      body: JSON.stringify({ target_type: targetType, target_id: targetId, value }),
    }),
};

export interface FeedItem {
  id: string;
  type: 'post' | 'poll' | 'announcement' | 'video';
  module_type: string;
  title: string;
  preview: string;
  comment_count: number;
  created_at: string;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  space: {
    id: string;
    namespace: string;
    title: string;
    description: string;
  } | null;
  importance?: string;
  thumbnail_url?: string;
  like_count?: number;
  view_count?: number;
}

export const feed = {
  getFeed: (page: number = 1, pageSize: number = 20) =>
    request<FeedItem[]>(`/feed?page=${page}&page_size=${pageSize}`),
};

// ===== 私信 (Direct Messages) =====

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
}

export interface ConversationSummary {
  other_user: User;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export const messages = {
  /** 发送私信 */
  send: (toUserId: string, content: string) =>
    request<DirectMessage>('/messages', {
      method: 'POST',
      body: JSON.stringify({ to_user_id: toUserId, content }),
    }),

  /** 获取会话列表 */
  getConversations: () =>
    request<ConversationSummary[]>('/messages/conversations'),

  /** 获取与某用户的对话 */
  getConversation: (userId: string, page: number = 1, pageSize: number = 50) =>
    request<DirectMessage[]>(`/messages/${userId}?page=${page}&page_size=${pageSize}`),

  /** 标记来自某用户的消息为已读 */
  markRead: (fromUserId: string) =>
    request<{ marked_read: number }>('/messages/read', {
      method: 'POST',
      body: JSON.stringify({ from_user_id: fromUserId }),
    }),

  /** 获取未读私信数量 */
  getUnreadCount: () =>
    request<number>('/messages/unread-count'),

  /** 删除与某用户的对话 */
  deleteConversation: (userId: string) =>
    request<{ deleted: boolean }>(`/messages/${userId}`, { method: 'DELETE' }),

  /** 置顶/取消置顶消息 */
  togglePin: (msgId: string) =>
    request<{ pinned: boolean }>(`/messages/${msgId}/pin`, { method: 'POST' }),

  /** 搜索私信 */
  search: (q: string, userId?: string, pageSize?: number) =>
    request<DirectMessage[]>(`/messages/search?q=${encodeURIComponent(q)}${userId ? '&user_id=' + userId : ''}&page_size=${pageSize || 20}`),

  /** 静音对话 */
  muteConversation: (userId: string) =>
    request<{ muted: boolean }>(`/messages/conversations/${userId}/mute`, { method: 'POST' }),

  /** 取消静音对话 */
  unmuteConversation: (userId: string) =>
    request<{ muted: boolean }>(`/messages/conversations/${userId}/mute`, { method: 'DELETE' }),

  /** 批量删除与多个用户的会话 */
  batchDelete: (userIds: string[]) =>
    request<{ deleted: number }>('/messages/delete', {
      method: 'POST',
      body: JSON.stringify({ ids: userIds }),
    }),
};

/** 联系人（互相关注的微信式通讯录） */
export const contacts = {
  /** 获取互相关注的联系人列表 */
  getMutual: () =>
    request<Array<{ id: string; username: string; display_name: string; is_mutual: boolean }>>('/contacts/mutual'),
};

// ===== 视频模块 =====

export interface VideoItem {
  id: string;
  space_id?: string | null;
  space_ns?: string | null;
  uploader: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  title: string;
  description: string;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  hls_url: string | null;
  status: string;
  visibility: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  share_code?: string;
  has_password?: boolean;
  space_review_status?: string | null;
  published_spaces?: Array<{
    space_id: string;
    namespace: string;
    title: string;
    review_status: string;
  }>;
  created_at: string;
}

export interface VideoComment {
  id: string;
  video_id: string;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  parent_id: string | null;
  body: string;
  like_count: number;
  created_at: string;
}

export const videos = {
  /** 获取空间视频列表 */
  list: (namespace: string, page?: number, pageSize?: number) => {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (pageSize) params.set('page_size', String(pageSize));
    return request<VideoItem[]>(`/spaces/${encodeNs(namespace)}/videos?${params.toString()}`);
  },

  /** 获取我的视频列表（创作中心） */
  myVideos: (page?: number, pageSize?: number) => {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (pageSize) params.set('page_size', String(pageSize));
    return request<VideoItem[]>(`/videos?${params.toString()}`);
  },

  /** 获取视频详情 */
  get: (id: string) => request<VideoItem>(`/videos/${id}`),

  /** 通过分享码获取视频 */
  getByShareCode: (code: string, password?: string) => {
    const params = new URLSearchParams();
    if (password) params.set('password', password);
    return request<VideoItem>(`/videos/share/${code}?${params.toString()}`);
  },

  /** 上传视频 (multipart/form-data) */
  upload: (file: File, title: string, description?: string, visibility?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', title);
    if (description) fd.append('description', description);
    fd.append('visibility', visibility || 'public');
    return request<VideoItem>(`/videos`, {
      method: 'POST',
      body: fd,
    });
  },

  /** 更新视频 */
  update: (id: string, data: { title?: string; description?: string; visibility?: string }) =>
    request<VideoItem>(`/videos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  /** 删除视频 */
  delete: (id: string) =>
    request<void>(`/videos/${id}`, { method: 'DELETE' }),

  /** 发布到社区 */
  publishToSpaces: (id: string, spaceIds: string[]) =>
    request<void>(`/videos/${id}/publish`, { method: 'POST', body: JSON.stringify({ space_ids: spaceIds }) }),

  /** 设置分享密码 */
  setPassword: (id: string, password: string) =>
    request<void>(`/videos/${id}/password`, { method: 'POST', body: JSON.stringify({ password }) }),

  /** 收藏 */
  toggleBookmark: (id: string) =>
    request<{ bookmarked: boolean }>(`/videos/${id}/bookmark`, { method: 'POST' }),

  /** 点赞 */
  toggleLike: (id: string) =>
    request<{ liked: boolean }>(`/videos/${id}/like`, { method: 'POST' }),

  /** 获取评论 */
  getComments: (id: string) =>
    request<VideoComment[]>(`/videos/${id}/comments`),

  /** 添加评论 */
  createComment: (id: string, body: string, parentId?: string) =>
    request<VideoComment>(`/videos/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body, ...(parentId ? { parent_id: parentId } : {}) }),
    }),
};

// ===== 创作中心 =====

export interface CreationItem {
  id: string;
  creator: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  content_type: string;
  title: string;
  body: string;
  cover_url: string | null;
  media_urls: string[];
  visibility: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  bookmark_count: number;
  share_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  has_password: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  submissions?: Array<{
    ref_id: string;
    space: { id: string; namespace: string; title: string };
    module_type: string;
    display_status: string;
    is_pinned: boolean;
    module_views: number;
    submitted_at: string;
  }>;
}

export const creations = {
  /** 获取我的创作列表 */
  list: (params?: { page?: number; page_size?: number; content_type?: string; sort?: string }) => {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.page_size) search.set('page_size', String(params.page_size));
    if (params?.content_type) search.set('content_type', params.content_type);
    if (params?.sort) search.set('sort', params.sort);
    const qs = search.toString();
    return request<CreationItem[]>(`/creations${qs ? `?${qs}` : ''}`);
  },

  /** 获取创作详情 */
  get: (id: string) => request<CreationItem>(`/creations/${id}`),

  /** 更新创作 */
  update: (id: string, data: { title?: string; body?: string; cover_url?: string; tags?: string[]; visibility?: string }) =>
    request<CreationItem>(`/creations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  /** 更新创作可见性 */
  updateVisibility: (id: string, visibility: string) =>
    request<CreationItem>(`/creations/${id}`, { method: 'PUT', body: JSON.stringify({ visibility }) }),

  /** 删除创作 */
  delete: (id: string) =>
    request<void>(`/creations/${id}`, { method: 'DELETE' }),

  /** 投稿到社区 */
  submit: (creationId: string, spaceId: string, moduleType: string) =>
    request<any>(`/creations/${creationId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ space_id: spaceId, module_type: moduleType }),
    }),

  /** 获取创作已投稿的社区列表 */
  submissions: (creationId: string) =>
    request<any[]>(`/creations/${creationId}/submissions`),
};
