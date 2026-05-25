'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, MessageCircle, Eye, Bookmark, Share2, ChevronLeft, Flag, ArrowRight, Clock, Download, Edit3, Trash2, BookOpen, UserPlus, UserCheck, MessageSquare } from 'lucide-react';
import { formatDate, formatCount, estimateReadTime, stripMarkdown } from '@/lib/utils';
import { buildPostLink } from '@/lib/module-config';
import { posts, series, creations, Comment, Post, type Series } from '@/lib/api';
import { VoteButton } from '@/components/VoteButton';
import { CherryRender } from '@/components/CherryRender';
import { StructuredDataRender } from '@/components/StructuredDataRender';

/** Decode JWT payload to extract user ID */
function getCurrentUserId(): string | null {
  try {
    const token = localStorage.getItem('polis_access_token');
    if (!token) return null;
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.sub || null;
  } catch { return null; }
}

/** 将 Creation 数据适配为 Post 格式，用于降级显示无投稿的创作 */
function adaptCreationToPost(c: any): Post {
  return {
    id: c.id,
    space_id: '',
    module_type: c.content_type || 'forum',
    author: c.creator || null,
    author_id: c.creator?.id,
    title: c.title || '',
    body: c.body || '',
    content_type: c.content_type || 'forum',
    tags: c.tags || [],
    media_urls: c.media_urls || [],
    visibility: c.visibility,
    is_pinned: false,
    is_featured: false,
    view_count: c.view_count || 0,
    like_count: c.like_count || 0,
    comment_count: c.comment_count || 0,
    is_liked: c.is_liked,
    is_bookmarked: c.is_bookmarked,
    has_password: c.has_password,
    created_at: c.created_at || '',
    updated_at: c.updated_at || '',
  };
}

/** 尝试作为 Creation 加载，成功则设置状态并返回 true */
async function tryLoadAsCreation(
  postId: string,
  setters: {
    setPost: (p: Post) => void;
    setLikeCount: (n: number) => void;
    setLiked: (b: boolean) => void;
    setBookmarked: (b: boolean) => void;
  }
): Promise<boolean> {
  try {
    const creationRes = await creations.get(postId);
    if (creationRes.code === 0 && creationRes.data) {
      const c = creationRes.data;
      setters.setPost(adaptCreationToPost(c));
      setters.setLikeCount(c.like_count || 0);
      setters.setLiked(c.is_liked || false);
      setters.setBookmarked(c.is_bookmarked || false);
      return true;
    }
  } catch {}
  return false;
}

function PostDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const postId = params.id as string;
  const spaceFromUrl = searchParams.get('space') || '';

  const [post, setPost] = useState<Post | null>(null);
  const [spaceNs, setSpaceNs] = useState(spaceFromUrl);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [creationRefs, setCreationRefs] = useState<any[]>([]);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editVisibility, setEditVisibility] = useState('public');
  const [editPassword, setEditPassword] = useState('');
  // 解锁密码保护的帖子
  const [showUnlock, setShowUnlock] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  // Follow author
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
  const [authorFollowLoading, setAuthorFollowLoading] = useState(false);

  // Series management
  const [spaceSeries, setSpaceSeries] = useState<Series[]>([]);
  const [seriesDropdownOpen, setSeriesDropdownOpen] = useState(false);
  const [seriesAdding, setSeriesAdding] = useState(false);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);

    (async () => {
      try {
        let res: any;

        if (spaceFromUrl) {
          try {
            res = await posts.get(spaceFromUrl, postId);
          } catch {
            // 空间 API 失败时降级为创作（creation）显示
            const loaded = await tryLoadAsCreation(postId, { setPost, setLikeCount, setLiked, setBookmarked });
            if (loaded) { setLoading(false); return; }
            setError('帖子不存在或已被删除');
            setLoading(false);
            return;
          }
        } else {
          const result = await posts.getById(postId);
          if (result) {
            setPost(result.post);
            setLikeCount(result.post.like_count || 0);
            setLiked(result.post.is_liked || false);
            setBookmarked(result.post.is_bookmarked || false);
            setSpaceNs(result.spaceNs);
            try {
              const commentsData = await posts.getCommentsById(postId);
              if (commentsData.data) {
                setComments(commentsData.data);
              }
            } catch {}
            setLoading(false);
            return;
          }
          // 降级查询：帖子不存在时尝试作为创作（creation）显示
          const loaded = await tryLoadAsCreation(postId, { setPost, setLikeCount, setLiked, setBookmarked });
          if (loaded) { setLoading(false); return; }
          setError('帖子不存在或已被删除');
          setLoading(false);
          return;
        }

        if (res.code === 0 && res.data) {
          setPost(res.data);
          setLikeCount(res.data.like_count || 0);
          setLiked(res.data.is_liked || false);
          setBookmarked(res.data.is_bookmarked || false);
          if (!spaceNs && spaceFromUrl) {
            setSpaceNs(spaceFromUrl);
          }

          try {
            const commentsData = await posts.getComments(spaceFromUrl, postId);
            if (commentsData.data) {
              setComments(commentsData.data);
            }
          } catch {}
        } else {
          // 降级查询：帖子/空间不存在时尝试作为创作（creation）显示
          const loaded = await tryLoadAsCreation(postId, { setPost, setLikeCount, setLiked, setBookmarked });
          if (loaded) { setLoading(false); return; }
          setError(res.message || '帖子不存在或已被删除');
        }
      } catch {
        setError('网络错误，请刷新重试');
      }
      setLoading(false);
    })();
  }, [postId, spaceFromUrl]);

  const currentNs = spaceNs || spaceFromUrl || '_';

  // Auto-increment view count when post loads
  useEffect(() => {
    if (!post || !postId) return;
    (async () => {
      try {
        const res = await posts.view(postId);
        if (res.data) {
          setPost((prev) => prev ? { ...prev, view_count: res.data!.view_count } : prev);
        }
      } catch {}
    })();
  }, [post?.id]);

  // Fetch creation refs (which communities reference this creation)
  useEffect(() => {
    if (!postId) return;
    (async () => {
      try {
        const refs = await creations.getRefs(postId);
        if (Array.isArray(refs)) {
          setCreationRefs(refs);
        }
      } catch {}
    })();
  }, [postId]);

  useEffect(() => {
    if (!post || !currentNs || currentNs === '_') return;
    setRelatedLoading(true);
    (async () => {
      try {
        const res = await posts.list(currentNs, { page_size: 10 });
        if (res.data) {
          const related = res.data.filter((p: any) => p.id !== post.id).slice(0, 3);
          setRelatedPosts(related);
        }
      } catch {}
      setRelatedLoading(false);
    })();
  }, [post, currentNs]);

  // Check if current user is the post author
  useEffect(() => {
    if (!post?.author) return;
    const currentUserId = getCurrentUserId();
    if (currentUserId && (post.author_id === currentUserId || post.author?.id === currentUserId)) {
      setIsAuthor(true);
    }
  }, [post]);

  // Check if current user is following the author
  useEffect(() => {
    if (!post?.author || isAuthor) return;
    const currentUserId = getCurrentUserId();
    if (!currentUserId) return;
    const authorUsername = post.author.username;
    if (!authorUsername) return;
    fetch(`/api/users/${authorUsername}/followers`, {
      headers: { Authorization: 'Bearer ' + localStorage.getItem('polis_access_token') },
    })
      .then(r => r.json())
      .then(d => {
        if (d.code === 0 && Array.isArray(d.data)) {
          setIsFollowingAuthor(d.data.some((u: any) => u.id === currentUserId));
        }
      })
      .catch(() => {});
  }, [post, isAuthor]);

  // Handle follow/unfollow author
  const handleFollowAuthor = async () => {
    if (!post?.author?.id) return;
    const token = localStorage.getItem('polis_access_token');
    if (!token) { window.location.href = '/login'; return; }
    setAuthorFollowLoading(true);
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ followee_type: 'user', followee_id: post.author.id }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setIsFollowingAuthor(data.data ?? true);
      }
    } catch {}
    setAuthorFollowLoading(false);
  };

  // Load space series when author is identified and space is known
  useEffect(() => {
    if (!isAuthor || !spaceNs) return;
    series.list(spaceNs).then(res => {
      if (res.code === 0 && Array.isArray(res.data)) {
        setSpaceSeries(res.data);
      }
    }).catch(() => {});
  }, [isAuthor, spaceNs]);

  // Handle adding post to series
  const handleAddToSeries = async (seriesId: string) => {
    if (!postId || seriesAdding) return;
    setSeriesAdding(true);
    try {
      await series.addPost(seriesId, postId);
      setSeriesDropdownOpen(false);
      alert('已添加到系列');
    } catch (e: any) {
      alert(e?.message || '添加失败');
    } finally {
      setSeriesAdding(false);
    }
  };

  const handleEdit = () => {
    if (!post) return;
    setIsEditing(true);
    setEditTitle(post.title);
    setEditBody(post.body || '');
    setEditTags(post.tags?.join(', ') || '');
    setEditVisibility(post.visibility || 'public');
    setEditPassword(''); // 编辑时不回显密码，留空表示不修改
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!post || !editTitle.trim()) return;
    try {
      const tagArray = editTags ? editTags.split(',').map(t => t.trim()).filter(Boolean) : undefined;
      // 密码分享：仅 unlisted 时发送密码
      const passwordPayload = editVisibility === 'unlisted' ? editPassword : undefined;
      const res = await posts.update(currentNs, post.id, {
        title: editTitle.trim(),
        body: editBody,
        tags: tagArray,
        visibility: editVisibility !== post.visibility ? editVisibility : undefined,
        password: passwordPayload,
      });
      if (res.data) {
        setPost(res.data);
        setIsEditing(false);
      }
    } catch {
      alert('编辑失败，请重试');
    }
  };

  // 解锁密码保护的帖子
  const handleUnlock = async () => {
    if (!unlockPassword.trim() || !postId) return;
    setUnlocking(true);
    try {
      const res = await posts.unlock(postId, unlockPassword);
      if (res.data) {
        setPost(res.data);
        setShowUnlock(false);
        setUnlockPassword('');
      }
    } catch (err: any) {
      alert(err.message || '密码错误，请重试');
    }
    setUnlocking(false);
  };

  const handleDelete = async () => {
    if (!post) return;
    if (!confirm(`确定删除帖子「${post.title}」？此操作不可撤销。`)) return;
    try {
      await posts.delete(currentNs, post.id);
      // Redirect to space page or home
      if (spaceFromUrl) {
        router.push(`/space/${spaceFromUrl}`);
      } else {
        router.push('/');
      }
    } catch {
      alert('删除失败，请重试');
    }
  };

  const handleLike = async () => {
    if (!post) return;
    try {
      const res = await posts.likeById(post.id);
      if (res.data !== null) {
        const data = res.data as any;
        const liked: boolean = typeof data === 'boolean' ? data : (data.liked ?? false);
        setLiked(liked);
        if (typeof data === 'object' && data.like_count !== undefined) {
          setLikeCount(data.like_count);
        } else {
          setLikeCount((prev) => (liked ? prev + 1 : Math.max(0, prev - 1)));
        }
      }
    } catch {}
  };

  const handleBookmark = async () => {
    if (!post) return;
    try {
      const res = await posts.bookmarkById(post.id);
      if (res.data !== null) {
        const data = res.data as any;
        setBookmarked(typeof data === 'boolean' ? data : (data.bookmarked ?? false));
      }
    } catch {}
  };

  const handleReport = async () => {
    if (!post) return;
    try {
      await posts.reportById(post.id, reportReason || '违规内容');
      setShowReport(false);
      setReportReason('');
      alert('举报已提交，我们会尽快处理。');
    } catch {
      alert('举报失败，请重试');
    }
  };

  const handleComment = async (parentId?: string) => {
    if (!post) return;
    const text = parentId ? replyText.trim() : commentText.trim();
    if (!text) return;
    try {
      const res = await posts.createCommentById(post.id, text, parentId);
      if (res.data) {
        setComments((prev) => [res.data!, ...prev]);
        if (parentId) {
          setReplyToId(null);
          setReplyText('');
        } else {
          setCommentText('');
        }
      }
    } catch {
      alert('评论失败，请重试');
    }
  };

  const handleCommentLike = async (commentId: string) => {
    try {
      const res = await posts.likeComment(commentId);
      if (res.data !== null) {
        setLikedComments((prev) => {
          const next = new Set(prev);
          res.data ? next.add(commentId) : next.delete(commentId);
          return next;
        });
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId ? { ...c, like_count: Math.max(0, c.like_count + (res.data ? 1 : -1)) } : c
          )
        );
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="post-glass animate-pulse space-y-4">
          <div className="h-6 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-2/3 bg-gray-100 dark:bg-gray-700 rounded" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-100 dark:bg-gray-700 rounded" />
            <div className="h-4 w-full bg-gray-100 dark:bg-gray-700 rounded" />
            <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <div className="text-4xl mb-4">😕</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{error || '帖子不存在'}</h2>
        <Link href="/" className="text-sm text-primary-600 hover:underline">返回首页</Link>
      </div>
    );
  }

  const author = post.author;
  const authorName = author?.display_name || author?.username || '匿名';
  const authorUsername = author?.username || '';

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* 面包屑导航 — 毛玻璃胶囊 */}
      <div className="mb-5">
        <Link
          href={spaceFromUrl ? `/space/${spaceFromUrl}` : '/'}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all duration-300
            bg-white/60 dark:bg-white/5 backdrop-blur-md
            border border-black/5 dark:border-white/5
            text-gray-500 dark:text-gray-400
            hover:bg-white/80 dark:hover:bg-white/10 hover:text-gray-800 dark:hover:text-gray-200 hover:border-black/10 dark:hover:border-white/10
            shadow-sm"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">返回</span>
          {spaceFromUrl ? (
            <>
              <span className="w-px h-3.5 bg-gray-300/60 dark:bg-gray-600/40" aria-hidden />
              <span className="text-xs text-gray-600 dark:text-gray-300 max-w-[200px] truncate">
                {spaceFromUrl.split('/').pop() || spaceFromUrl}
              </span>
            </>
          ) : (
            <span className="text-xs text-gray-600 dark:text-gray-300">首页</span>
          )}
        </Link>
      </div>

      <article className="post-glass">
        {/* 作者信息区 — 明确标注 + 关注 + 私信 */}
        <div className="flex items-start gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <Link href={authorUsername ? `/profile/${authorUsername}` : '#'} className="shrink-0">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium text-lg hover:ring-2 ring-primary-300 transition-all">
              {authorName.charAt(0)}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                作者
              </span>
              <Link href={authorUsername ? `/profile/${authorUsername}` : '#'} className="font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                {authorName}
              </Link>
              {authorUsername && (
                <span className="text-sm text-gray-400 dark:text-gray-500">@{authorUsername}</span>
              )}
              <span className="text-xs text-gray-400">· {formatDate(post.created_at)}</span>
            </div>
            {spaceFromUrl && (
              <Link href={`/space/${spaceFromUrl}`} className="text-xs text-primary-600 dark:text-primary-400 hover:underline mt-0.5 inline-block">
                /{spaceFromUrl}
              </Link>
            )}
          </div>
          {/* 非作者本人时才显示关注/私信按钮 */}
          {!isAuthor && author && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleFollowAuthor}
                disabled={authorFollowLoading}
                className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  isFollowingAuthor
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500'
                    : 'btn-primary text-xs px-3 py-1.5'
                }`}
              >
                {authorFollowLoading ? (
                  <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isFollowingAuthor ? (
                  <><UserCheck className="h-3.5 w-3.5" /> 已关注</>
                ) : (
                  <><UserPlus className="h-3.5 w-3.5" /> 关注</>
                )}
              </button>
              <Link
                href={`/messages/${author.id}`}
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-all bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400"
              >
                <MessageSquare className="h-3.5 w-3.5" /> 私信
              </Link>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-2xl font-bold rounded-lg border border-gray-200 dark:border-gray-700 p-3 dark:bg-gray-800 dark:text-white"
              placeholder="标题"
            />
            <input
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-sm dark:bg-gray-800 dark:text-white"
              placeholder="标签 (用逗号分隔, 如: Rust, 教程)"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-500 dark:text-gray-400">可见性:</span>
              <select
                value={editVisibility}
                onChange={(e) => { setEditVisibility(e.target.value); if (e.target.value !== 'unlisted') setEditPassword(''); }}
                className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-sm dark:bg-gray-800 dark:text-white"
              >
                <option value="public">🌐 公开 — 所有人可见</option>
                <option value="private">🔒 私密 — 仅自己可见</option>
                <option value="unlisted">🔗 密码分享 — 输入密码后可见</option>
              </select>
            </div>
            {editVisibility === 'unlisted' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">分享密码:</span>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-sm dark:bg-gray-800 dark:text-white w-48"
                  placeholder="设置访问密码"
                />
                {editPassword && (
                  <span className="text-xs text-gray-400">🔑 访问者需输入此密码才能查看内容</span>
                )}
              </div>
            )}
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="w-full min-h-[300px] rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm font-mono dark:bg-gray-800 dark:text-white resize-y"
              placeholder="Markdown 正文内容"
              rows={15}
            />
            <div className="flex gap-2">
              <button onClick={handleSaveEdit} disabled={!editTitle.trim()} className="btn btn-primary text-sm disabled:opacity-50">保存修改</button>
              <button onClick={handleCancelEdit} className="btn text-sm">取消</button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{post.title}</h1>

            {post.tags && post.tags.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {post.tags.map((tag: string) => (
                  <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">#{tag}</span>
                ))}
              </div>
            )}

            {/* 密码保护 — 非作者需解锁查看 */}
            {(post as any).has_password && !(post as any).body && !isAuthor ? (
              <div className="my-8 p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border border-amber-200/60 dark:border-amber-700/30">
                <div className="text-center mb-4">
                  <span className="text-4xl">🔐</span>
                  <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">此内容已加密分享</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">请输入分享密码以查看完整内容</p>
                </div>
                <div className="flex gap-2 max-w-sm mx-auto">
                  <input
                    type="password"
                    value={unlockPassword}
                    onChange={(e) => setUnlockPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                    className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 text-sm dark:bg-gray-800 dark:text-white"
                    placeholder="请输入分享密码"
                  />
                  <button
                    onClick={handleUnlock}
                    disabled={unlocking || !unlockPassword.trim()}
                    className="btn-primary text-sm px-4 disabled:opacity-50"
                  >
                    {unlocking ? '验证中...' : '解锁'}
                  </button>
                </div>
              </div>
            ) : (
              (post.content_type === 'json_data' || post.content_type === 'table_data') ? (
                <StructuredDataRender content_type={post.content_type} body={post.body!} />
              ) : (
                <CherryRender markdown={post.body} />
              )
            )}
          </>
        )}

        <div className="mt-8 flex items-center gap-4 border-t border-gray-100 dark:border-gray-700 pt-4 flex-wrap">
          <VoteButton targetType="post" targetId={post.id} />
          <button onClick={handleLike}
            className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
            <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} /> {formatCount(likeCount)}
          </button>
          <span className="flex items-center gap-1.5 text-sm text-gray-400">
            <MessageCircle className="h-5 w-5" /> {formatCount(post.comment_count)}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-gray-400">
            <Eye className="h-5 w-5" /> {formatCount(post.view_count)}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-gray-400">
            <Clock className="h-5 w-5" /> {estimateReadTime(post.body || '')}
          </span>
          <button onClick={handleBookmark}
            className={`flex items-center gap-1.5 text-sm transition-colors ${bookmarked ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}>
            <Bookmark className={`h-5 w-5 ${bookmarked ? 'fill-current' : ''}`} />
          </button>
          <a href={`https://www.mzgw.com/api/posts/${post.id}/download`}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            title="下载 Markdown">
            <Download className="h-5 w-5" />
          </a>
          <button onClick={() => { const url = window.location.href; navigator.clipboard.writeText(url).then(() => alert('链接已复制')); }}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            <Share2 className="h-5 w-5" />
          </button>
          {isAuthor && (
            <>
              <button onClick={handleEdit}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary-600 transition-colors">
                <Edit3 className="h-5 w-5" /> 编辑
              </button>
              <button onClick={handleDelete}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="h-5 w-5" /> 删除
              </button>
              {/* Series management dropdown */}
              <div className="relative">
                <button
                  onClick={() => setSeriesDropdownOpen(!seriesDropdownOpen)}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  title="管理系列"
                >
                  <BookOpen className="h-5 w-5" />
                  {spaceSeries.length > 0 && (
                    <span className="hidden sm:inline">系列</span>
                  )}
                </button>
                {seriesDropdownOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-50">
                    <div className="p-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">添加到系列</p>
                      {spaceSeries.length === 0 ? (
                        <p className="text-xs text-gray-400 px-2 py-2">此空间暂无系列</p>
                      ) : (
                        spaceSeries.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => handleAddToSeries(s.id)}
                            disabled={seriesAdding}
                            className="w-full text-left px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                          >
                            <span className="flex items-center gap-2">
                              <BookOpen className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                              <span className="truncate">{s.title}</span>
                              <span className="text-xs text-gray-400 ml-auto">{s.post_count}篇</span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          <button onClick={() => setShowReport(!showReport)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors ml-auto">
            <Flag className="h-5 w-5" /> 举报
          </button>
        </div>

        {showReport && (
          <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="请输入举报原因..."
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm dark:bg-gray-800 dark:text-white resize-none"
              rows={2}
            />
            <div className="mt-2 flex gap-2">
              <button onClick={handleReport} className="btn btn-primary text-xs">提交举报</button>
              <button onClick={() => setShowReport(false)} className="btn text-xs">取消</button>
            </div>
          </div>
        )}
      </article>

      <div className="mt-6 post-glass">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">评论 ({comments.length})</h3>
        {/* New comment input */}
        <div className="flex gap-3">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="发表评论"
            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm dark:bg-gray-800 dark:text-white resize-none"
            rows={3}
          />
        </div>
        <button
          onClick={() => handleComment()}
          disabled={!commentText.trim()}
          className="mt-2 btn btn-primary text-sm disabled:opacity-50"
        >
          发表评论
        </button>

        {comments.length === 0 ? (
          <p className="text-center text-gray-400 text-sm mt-6">暂无评论，来发表第一条评论吧</p>
        ) : (
          (() => {
            // Build comment tree from flat list
            const childrenMap = new Map<string, Comment[]>();
            const roots: Comment[] = [];
            for (const c of comments) {
              if (c.parent_id) {
                const list = childrenMap.get(c.parent_id) || [];
                list.push(c);
                childrenMap.set(c.parent_id, list);
              } else {
                roots.push(c);
              }
            }

            const MAX_DEPTH = 5;

            const renderCommentNode = (comment: Comment, depth: number): React.ReactNode => {
              const children = childrenMap.get(comment.id) || [];
              const isCommentLiked = likedComments.has(comment.id);
              const isReplying = replyToId === comment.id;

              return (
                <div key={comment.id}>
                  <div className={`flex gap-3 pt-3 ${depth === 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}>
                    {/* Indentation and thread line for nested replies */}
                    {depth > 0 && (
                      <div className="shrink-0 flex items-stretch" style={{ width: depth * 20 + 8 }}>
                        <div className="w-px bg-gray-200 dark:bg-gray-700" />
                      </div>
                    )}
                    <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-medium mt-0.5">
                      {(comment.author?.display_name || comment.author?.username || '匿').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {comment.author?.display_name || comment.author?.username || '匿名'}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                      </div>
                      <div className="mt-0.5">
                        <CherryRender markdown={comment.body} />
                      </div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <button
                          onClick={() => handleCommentLike(comment.id)}
                          className={`flex items-center gap-1 text-xs transition-colors ${isCommentLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                        >
                          <Heart className={`h-3.5 w-3.5 ${isCommentLiked ? 'fill-current' : ''}`} />
                          {comment.like_count > 0 ? formatCount(comment.like_count) : ''}
                        </button>
                        <button
                          onClick={() => { setReplyToId(isReplying ? null : comment.id); setReplyText(''); }}
                          className={`flex items-center gap-1 text-xs transition-colors ${isReplying ? 'text-primary-500' : 'text-gray-400 hover:text-primary-600'}`}
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> 回复
                        </button>
                      </div>
                      {/* Inline reply input */}
                      {isReplying && (
                        <div className="mt-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-500">
                              回复 @{comment.author?.username || comment.author?.display_name || '匿名'}
                            </span>
                            <button onClick={() => { setReplyToId(null); setReplyText(''); }} className="text-xs text-gray-400 hover:text-gray-600">取消</button>
                          </div>
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="输入回复..."
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-sm dark:bg-gray-800 dark:text-white resize-none"
                            rows={2}
                          />
                          <button onClick={() => handleComment(comment.id)} disabled={!replyText.trim()} className="mt-2 btn btn-primary text-xs disabled:opacity-50">发表回复</button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Nested children */}
                  {depth < MAX_DEPTH && children.length > 0 && (
                    <div>
                      {children.map(child => renderCommentNode(child, depth + 1))}
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div className="mt-6 space-y-0">
                {roots.map(root => renderCommentNode(root, 0))}
              </div>
            );
          })()
        )}
      </div>

      {/* Creation Refs — 引用地图：创作被哪些社区引用 */}
      {creationRefs.length > 0 && (
        <div className="mt-6 post-glass">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>📌 同时也在这里</span>
            <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
              该作品已发布至 {creationRefs.length} 个社区
            </span>
          </h3>
          <div className="space-y-2">
            {creationRefs.map((ref, idx) => (
              <Link
                key={idx}
                href={`/space/${ref.namespace}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 transition-colors border-b border-gray-100/50 dark:border-gray-700/30 last:border-b-0 group"
              >
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {(ref.title || ref.namespace).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {ref.title || ref.namespace}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                      /{ref.namespace}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700/50">
                      {ref.module_type === 'forum' ? '💬 论坛' :
                       ref.module_type === 'wiki' ? '📖 百科' :
                       ref.module_type === 'blog' ? '📝 博客' :
                       ref.module_type === 'docs' ? '📄 文档' :
                       ref.module_type === 'news' ? '📰 资讯' : ref.module_type}
                    </span>
                    <span>👥 {ref.member_count || 0} 成员</span>
                    <span>📄 {ref.post_count || 0} 帖子</span>
                    <span className={ref.visibility === 'public' ? 'text-emerald-500' : 'text-amber-500'}>
                      {ref.visibility === 'public' ? '🌐 公开' : '🔒 私密'}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-primary-500 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {relatedPosts.length > 0 && (
        <div className="mt-6 post-glass">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">同社区更多帖子</h3>
          <div className="space-y-3">
            {relatedPosts.map((p) => (
              <Link key={p.id} href={buildPostLink(p.id, currentNs)} className="block p-3 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 transition-colors border-b border-gray-100/50 dark:border-gray-700/30 last:border-b-0">
                <h4 className="font-medium text-gray-900 mb-1">{p.title}</h4>
                <p className="text-sm text-gray-500 line-clamp-2">{stripMarkdown(p.summary || p.body)}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {formatCount(p.like_count)}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {formatCount(p.comment_count)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PostPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="card animate-pulse space-y-4">
          <div className="h-6 w-1/3 bg-gray-200 rounded" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-100 rounded" />
            <div className="h-4 w-full bg-gray-100 rounded" />
            <div className="h-4 w-3/4 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    }>
      <PostDetailContent />
    </Suspense>
  );
}
