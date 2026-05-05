'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, MessageCircle, Eye, Bookmark, Share2, ChevronLeft, Flag, ArrowRight, Clock, Download, Edit3, Trash2 } from 'lucide-react';
import { formatDate, formatCount, estimateReadTime } from '@/lib/utils';
import { posts, Comment, Post } from '@/lib/api';
import { VoteButton } from '@/components/VoteButton';
import { CherryRender } from '@/components/CherryRender';

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
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editVisibility, setEditVisibility] = useState('public');

  useEffect(() => {
    if (!postId) return;
    setLoading(true);

    (async () => {
      try {
        let res: any;

        if (spaceFromUrl) {
          res = await posts.get(spaceFromUrl, postId);
        } else {
          const result = await posts.getById(postId);
          if (result) {
            setPost(result.post);
            setLikeCount(result.post.like_count || 0);
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
          setError('帖子不存在或已被删除');
          setLoading(false);
          return;
        }

        if (res.code === 0 && res.data) {
          setPost(res.data);
          setLikeCount(res.data.like_count || 0);
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

  const handleEdit = () => {
    if (!post) return;
    setIsEditing(true);
    setEditTitle(post.title);
    setEditBody(post.body || '');
    setEditTags(post.tags?.join(', ') || '');
    setEditVisibility(post.visibility || 'public');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!post || !editTitle.trim()) return;
    try {
      const tagArray = editTags ? editTags.split(',').map(t => t.trim()).filter(Boolean) : undefined;
      const res = await posts.update(currentNs, post.id, {
        title: editTitle.trim(),
        body: editBody,
        tags: tagArray,
        visibility: editVisibility !== post.visibility ? editVisibility : undefined,
      });
      if (res.data) {
        setPost(res.data);
        setIsEditing(false);
      }
    } catch {
      alert('编辑失败，请重试');
    }
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
      const res = await posts.like(currentNs, post.id);
      if (res.data !== null) {
        setLiked(res.data);
        setLikeCount((prev) => (res.data ? prev + 1 : prev - 1));
      }
    } catch {}
  };

  const handleBookmark = async () => {
    if (!post) return;
    try {
      const res = await posts.bookmark(currentNs, post.id);
      if (res.data !== null) setBookmarked(res.data);
    } catch {}
  };

  const handleReport = async () => {
    if (!post) return;
    try {
      await posts.report(currentNs, post.id, reportReason || '违规内容');
      setShowReport(false);
      setReportReason('');
      alert('举报已提交，我们会尽快处理。');
    } catch {
      alert('举报失败，请重试');
    }
  };

  const handleComment = async () => {
    if (!post || !commentText.trim()) return;
    try {
      const res = await posts.createComment(currentNs, post.id, commentText.trim());
      if (res.data) {
        setComments((prev) => [res.data!, ...prev]);
        setCommentText('');
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
            c.id === commentId ? { ...c, like_count: c.like_count + (res.data ? 1 : -1) } : c
          )
        );
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="card animate-pulse space-y-4">
          <div className="h-6 w-1/3 bg-gray-200 rounded" />
          <div className="h-4 w-2/3 bg-gray-100 rounded" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-100 rounded" />
            <div className="h-4 w-full bg-gray-100 rounded" />
            <div className="h-4 w-3/4 bg-gray-100 rounded" />
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
      <Link href={spaceFromUrl ? `/space/${spaceFromUrl}` : '/'} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ChevronLeft className="h-4 w-4" /> {spaceFromUrl ? `返回 /${spaceFromUrl}` : '返回首页'}
      </Link>

      <article className="card">
        <div className="flex items-start gap-3 mb-6">
          <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium text-lg">
            {authorName.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Link href={authorUsername ? `/profile/${authorUsername}` : '#'} className="font-medium text-gray-900 hover:text-primary-600">
                {authorName}
              </Link>
              <span className="text-xs text-gray-400">· {formatDate(post.created_at)}</span>
            </div>
            {spaceFromUrl && (
              <Link href={`/space/${spaceFromUrl}`} className="text-xs text-primary-600 hover:underline">
                /{spaceFromUrl}
              </Link>
            )}
          </div>
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">可见性:</span>
              <select
                value={editVisibility}
                onChange={(e) => setEditVisibility(e.target.value)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-sm dark:bg-gray-800 dark:text-white"
              >
                <option value="public">🌐 公开 — 所有人可见</option>
                <option value="private">🔒 私密 — 仅自己可见</option>
                <option value="space_member">👥 社区成员 — 仅社区成员可见</option>
              </select>
            </div>
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
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h1>

            {post.tags && post.tags.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {post.tags.map((tag: string) => (
                  <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">#{tag}</span>
                ))}
              </div>
            )}

            <CherryRender markdown={post.body} />
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

      <div className="mt-6 card">
        <h3 className="font-semibold text-gray-900 mb-4">评论 ({comments.length})</h3>
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
          onClick={handleComment}
          disabled={!commentText.trim()}
          className="mt-2 btn btn-primary text-sm disabled:opacity-50"
        >
          发表评论
        </button>

        {comments.length === 0 ? (
          <p className="text-center text-gray-400 text-sm mt-6">暂无评论，来发表第一条评论吧</p>
        ) : (
          <div className="mt-6 space-y-4">
            {comments.map((comment) => {
              const isCommentLiked = likedComments.has(comment.id);
              return (
              <div key={comment.id} className="flex gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-medium">
                  {(comment.author?.display_name || comment.author?.username || '匿').charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">{comment.author?.display_name || comment.author?.username || '匿名'}</span>
                    <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{comment.body}</p>
                  <button
                    onClick={() => handleCommentLike(comment.id)}
                    className={`mt-1.5 flex items-center gap-1 text-xs transition-colors ${isCommentLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${isCommentLiked ? 'fill-current' : ''}`} />
                    {comment.like_count > 0 ? formatCount(comment.like_count) : ''}
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {relatedPosts.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-gray-900 mb-4">同社区更多帖子</h3>
          <div className="space-y-3">
            {relatedPosts.map((p) => (
              <Link key={p.id} href={`/post/${p.id}?space=${currentNs}`} className="card block hover:border-primary-300 transition-colors">
                <h4 className="font-medium text-gray-900 mb-1">{p.title}</h4>
                <p className="text-sm text-gray-500 line-clamp-2">{p.summary || p.body}</p>
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
