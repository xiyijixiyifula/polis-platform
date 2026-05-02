const API_BASE = '/api';

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
  created_at: string;
}

export interface Post {
  id: string;
  space_id: string;
  module_type: string;
  author: User | null;
  author_id?: string;
  title: string;
  body: string;
  content_type: string;
  tags: string[];
  media_urls?: string[];
  is_pinned: boolean;
  is_featured: boolean;
  is_deleted?: boolean;
  view_count: number;
  like_count: number;
  comment_count: number;
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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

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

  get: (namespace: string) => request<Space>(`/spaces/${namespace}`),

  update: (namespace: string, data: Record<string, unknown>) =>
    request<Space>(`/spaces/${namespace}`, { method: 'PUT', body: JSON.stringify(data) }),

  join: (namespace: string) =>
    request<void>(`/spaces/${namespace}/join`, { method: 'POST' }),

  leave: (namespace: string) =>
    request<void>(`/spaces/${namespace}/leave`, { method: 'POST' }),

  trending: () => request<Space[]>('/spaces/trending'),
};

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
  /** 搜索帖子 */
  posts: (q: string, pageSize?: number) => {
    const params = new URLSearchParams({ q });
    if (pageSize) params.set('page_size', String(pageSize));
    return request<Post[]>('/posts/search?' + params.toString());
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
    request<SpaceTier[]>(`/tiers/space/${namespace}`),

  /** 创建会员等级 */
  create: (namespace: string, data: { name: string; price_cents: number; description?: string; benefits?: string[] }) =>
    request<{id: string}>(`/tiers/space/${namespace}`, {
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
    request<{id: string}>(`/subscribe/space/${namespace}`, {
      method: 'POST',
      body: JSON.stringify({ tier_id: tierId }),
    }),

  /** 取消订阅 */
  cancel: (namespace: string) =>
    request<void>(`/subscribe/space/${namespace}`, { method: 'DELETE' }),

  /** 获取当前用户订阅状态 */
  get: (namespace: string) =>
    request<Subscription | null>(`/subscribe/space/${namespace}`),
};

export const series = {
  /** 创建系列（专栏） */
  create: (namespace: string, data: { title: string; description?: string; cover_url?: string; visibility?: string }) =>
    request<{id: string}>(`/series/space/${namespace}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** 获取空间的系列列表 */
  list: (namespace: string) =>
    request<Series[]>(`/series/space/${namespace}`),

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
  create: (namespace: string, data: { title: string; body: string; module_type?: string; tags?: string[] }) =>
    request<Post>(`/spaces/${namespace}/posts`, {
      method: 'POST',
      body: JSON.stringify({ ...data, content_type: 'text', module_type: data.module_type || 'forum' }),
    }),

  list: (namespace: string, params?: { page?: number; page_size?: number; module?: string }) => {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.page_size) search.set('page_size', String(params.page_size));
    if (params?.module) search.set('module', params.module);
    const qs = search.toString();
    return request<Post[]>(`/spaces/${namespace}/posts${qs ? `?${qs}` : ''}`);
  },

  get: (namespace: string, id: string) => request<Post>(`/spaces/${namespace}/posts/${id}`),

  getById: async (id: string): Promise<{ post: Post; spaceNs: string } | null> => {
    try {
      const data = await request<Post>(`/posts/${id}`);
      if (data.code === 0 && data.data) {
        const post = data.data;
        const spaceNs = await resolveSpaceNs(post.space_id);
        return { post, spaceNs };
      }
    } catch {}
    return null;
  },

  getComments: (namespace: string, postId: string) =>
    request<Comment[]>(`/spaces/${namespace}/posts/${postId}/comments`),

  getCommentsById: (postId: string) =>
    request<Comment[]>(`/posts/${postId}/comments`),

  createComment: (namespace: string, postId: string, body: string) =>
    request<Comment>(`/spaces/${namespace}/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  like: (namespace: string, id: string) =>
    request<boolean>(`/spaces/${namespace}/posts/${id}/like`, { method: 'POST' }),

  bookmark: (namespace: string, id: string) =>
    request<boolean>(`/spaces/${namespace}/posts/${id}/bookmark`, { method: 'POST' }),

  report: (namespace: string, id: string, reason: string) =>
    request<void>(`/spaces/${namespace}/posts/${id}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  delete: (namespace: string, id: string) =>
    request<void>(`/spaces/${namespace}/posts/${id}`, { method: 'DELETE' }),
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
  type: 'post' | 'poll' | 'announcement';
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
}

export const feed = {
  getFeed: (page: number = 1, pageSize: number = 20) =>
    request<FeedItem[]>(`/feed?page=${page}&page_size=${pageSize}`),
};
