'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Heart, MessageCircle, Eye, Bookmark, Share2, ChevronLeft, Flag, ArrowRight } from 'lucide-react';
import { formatDate, formatCount } from '@/lib/utils';
import { posts, Comment, Post } from '@/lib/api';
import { VoteButton } from '@/components/VoteButton';

function renderMarkdown(md: string): string {
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-5 mb-2 text-gray-900">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-2 text-gray-900">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3 text-gray-900">$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-primary-600 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-600 hover:underline" target="_blank">$1</a>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg max-w-full my-3" loading="lazy" />')
    .replace(/^- (.+)$/gm, '<li class="text-gray-600 ml-5 list-disc mb-1">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="text-gray-600 ml-5 list-decimal mb-1">$1</li>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-gray-900 text-gray-100 rounded-xl p-4 my-4 overflow-x-auto text-sm leading-relaxed"><code>$2</code></pre>')
    .replace(/^---$/gm, '<hr class="my-6 border-gray-200" />')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-primary-300 bg-primary-50/30 pl-4 py-2 my-3 text-gray-600 italic rounded-r-lg">$1</blockquote>')
    .replace(/\n\n/g, '</p><p class="text-gray-600 mb-3 leading-relaxed">')
    .replace(/\n/g, '<br />');
  return '<p class="text-gray-600 mb-3 leading-relaxed">' + html + '</p>';
}

function PostDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
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

  useEffect(() => {
    if (!postId) return;
    setLoading(true);

    (async () => {
      try {
        let res: any;

        if (spaceFromUrl) {
          // 有 namespace → 直接用
          res = await posts.get(spaceFromUrl, postId);
        } else {
          // 无 namespace → 通过 ID 查找
          const result = await posts.getById(postId);
          if (result) {
            setPost(result.post);
            setLikeCount(result.post.like_count || 0);
            setSpaceNs(result.spaceNs);
            // 加载评论
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

  // Fetch related posts from the same space
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



  const handleLike = async () => {
    if (!post) return;
    try {
      const res = await posts.like(currentNs, post.id);
      if (res.data !== null) {
        setLiked(res.data);
        setLikeCount(prev => res.data ? prev + 1 : prev - 1);
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
        setComments(prev => [res.data!, ...prev]);
        setCommentText('');
      }
    } catch {
      alert('评论失败，请重试');
    }
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

        <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h1>

        {post.tags && post.tags.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {post.tags.map((tag: string) => (
              <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">#{tag}</span>
            ))}
          </div>
        )}

        <div className="prose prose-gray max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }} />

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
          <button onClick={handleBookmark}
            className={`flex items-center gap-1.5 text-sm transition-colors ${bookmarked ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}>
            <Bookmark className={`h-5 w-5 ${bookmarked ? 'fill-current' : ''}`} />
          </button>
          <button onClick={() => {
            if (navigator.share) {
              navigator.share({ title: post.title, url: window.location.href });
            } else {
              navigator.clipboard.writeText(window.location.href);
            }
          }} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary-600">
            <Share2 className="h-5 w-5" />
          </button>
          <button onClick={() => setShowReport(!showReport)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 ml-auto">
            <Flag className="h-4 w-4" /> 举报
          </button>
        </div>

        {showReport && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm font-medium text-red-800 mb-2">举报此内容</p>
            <textarea className="w-full rounded border border-red-200 p-2 text-sm" rows={2} placeholder="请说明举报原因..."
              value={reportReason} onChange={(e) => setReportReason(e.target.value)} />
            <div className="mt-2 flex justify-end gap-2">
              <button onClick={() => setShowReport(false)} className="text-xs px-3 py-1 text-gray-500">取消</button>
              <button onClick={handleReport} className="text-xs px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">提交举报</button>
            </div>
          </div>
        )}
      </article>

      <div className="mt-6 card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">评论 ({comments.length})</h2>
        <div className="flex items-start gap-3 mb-6">
          <div className="h-9 w-9 shrink-0 rounded-full bg-primary-400 flex items-center justify-center text-white font-medium text-sm">我</div>
          <div className="flex-1">
            <textarea className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 resize-none" rows={3}
              placeholder="写下你的评论...（支持 Markdown）" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
            <div className="mt-2 flex justify-end">
              <button className="btn-primary text-xs px-5 py-1.5" disabled={!commentText.trim()} onClick={handleComment}>
                发表评论
              </button>
            </div>
          </div>
        </div>

        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="h-8 w-8 shrink-0 rounded-full bg-gray-400 flex items-center justify-center text-white font-medium text-xs">
                  {comment.author?.display_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {comment.author?.display_name || comment.author?.username || '匿名'}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{comment.body}</p>
                  <div className="mt-1 flex items-center gap-3">
                    <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500">
                      <Heart className="h-3.5 w-3.5" /> {comment.like_count}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">暂无评论，来发表第一条评论吧</p>
        )}
      </div>

      {/* 关联推荐 */}
      {relatedPosts.length > 0 && (
        <div className="mt-6 card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            同社区更多文章
          </h2>
          <div className="space-y-3">
            {relatedPosts.map((rp: any) => (
              <Link
                key={rp.id}
                href={`/post/${rp.id}?space=${encodeURIComponent(currentNs)}`}
                className="block rounded-lg border border-gray-100 dark:border-gray-700 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                  {rp.title}
                </h3>
                {rp.body && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {rp.body.replace(/[#*\`\[\]>\-]/g, '').substring(0, 120)}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                  <span>👍 {rp.like_count || 0}</span>
                  <span>💬 {rp.comment_count || 0}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PostDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">加载中...</div>}>
      <PostDetailContent />
    </Suspense>
  );
}
