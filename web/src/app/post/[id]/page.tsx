'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Heart, MessageCircle, Eye, Bookmark, Share2, ChevronLeft, Flag, ArrowRight } from 'lucide-react';
import { formatDate, formatCount } from '@/lib/utils';
import { posts, Comment, Post } from '@/lib/api';
import { VoteButton } from '@/components/VoteButton';

// ============================================
// Fixed Cherry Markdown Renderer
// ============================================

let cherryRendererInstance: any = null;
let cherryRendererPromise: Promise<any> | null = null;
let cherryRendererFailed = false;

async function getCherryRenderer(): Promise<any> {
  // If previously failed, don't retry - will use fallback
  if (cherryRendererFailed) {
    throw new Error('Cherry renderer previously failed');
  }
  if (cherryRendererInstance) return cherryRendererInstance;
  if (cherryRendererPromise) return cherryRendererPromise;

  cherryRendererPromise = (async () => {
    try {
      const { default: Cherry } = await import('cherry-markdown');
      const containerId = 'cherry-r-' + Math.random().toString(36).slice(2);

      // Create hidden container for Cherry to render into
      let container = document.getElementById(containerId);
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.position = 'absolute';
        container.style.visibility = 'hidden';
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);
      }

      const instance = new Cherry({
        id: containerId,
        value: '',
        editor: { defaultModel: 'previewOnly', height: 'auto' },
        toolbars: { showToolbar: false },
        engine: {
          syntax: {
            codeBlock: { wrap: true, lineNumber: true, copyCode: true },
            table: { enableChart: true },
          },
        },
        externals: {},
      });

      cherryRendererInstance = instance;
      return instance;
    } catch (err) {
      cherryRendererFailed = true;
      cherryRendererPromise = null;
      throw err;
    }
  })();

  return cherryRendererPromise;
}

// Fallback simple markdown renderer (reliable, no Cherry dependency)
function renderMarkdownSimple(md: string): string {
  if (!md) return '';
  let h = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-5 mb-2 text-gray-900 dark:text-white">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-2 text-gray-900 dark:text-white">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3 text-gray-900 dark:text-white">$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del class="text-gray-400">$1</del>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-700 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-gray-900 text-gray-100 rounded-xl p-4 my-4 overflow-x-auto text-sm"><code>$2</code></pre>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg max-w-full my-3" loading="lazy" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-600 hover:underline" target="_blank">$1</a>')
    .replace(/^- (.+)$/gm, '<li class="ml-5 list-disc mb-1 text-gray-600 dark:text-gray-300">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-5 list-decimal mb-1 text-gray-600 dark:text-gray-300">$1</li>')
    .replace(/^---$/gm, '<hr class="my-6 border-gray-200 dark:border-gray-700" />')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-primary-300 dark:border-primary-700 bg-primary-50/30 dark:bg-primary-900/20 pl-4 py-2 my-3 text-gray-600 dark:text-gray-300 italic rounded-r-lg">$1</blockquote>')
    .replace(/\n\n/g, '</p><p class="mb-3 leading-relaxed text-gray-600 dark:text-gray-300">')
    .replace(/\n/g, '<br />');
  return '<div class="prose prose-gray dark:prose-invert max-w-none"><p class="mb-3 leading-relaxed text-gray-600 dark:text-gray-300">' + h + '</p></div>';
}

// Module-level cache (with size limit to prevent memory leak)
const MAX_CACHE_SIZE = 50;
const renderCache = new Map<string, string>();

function setCache(key: string, value: string) {
  if (renderCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry
    const firstKey = renderCache.keys().next().value || "";
    renderCache.delete(firstKey);
  }
  renderCache.set(key, value);
}

// ============================================
// Fixed PostContent Component
// ============================================

function PostContent({ body }: { body: string }) {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!body) {
      setLoading(false);
      return;
    }

    // Reset loading state when body changes
    setLoading(true);

    // Check cache first
    if (renderCache.has(body)) {
      setHtml(renderCache.get(body)!);
      setLoading(false);
      return;
    }

    // Set timeout fallback - if Cherry takes too long, use simple renderer
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        const fallback = renderMarkdownSimple(body);
        setHtml(fallback);
        setCache(body, fallback);
        setLoading(false);
      }
    }, 3000);

    getCherryRenderer()
      .then((cherry) => {
        if (!isMountedRef.current) return;

        cherry.setMarkdown(body, true);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!isMountedRef.current) return;

            try {
              let rendered = '';

              // Get rendered HTML from Cherry's previewer DOM
              if (cherry.previewer) {
                try {
                  const container = cherry.previewer.getDomContainer
                    ? cherry.previewer.getDomContainer()
                    : null;
                  if (container) {
                    // Try to get the preview content (cherry-previewer class or first child)
                    const previewEl = container.querySelector('.cherry-previewer')
                      || container.querySelector('.cherry-edit')
                      || container.firstElementChild
                      || container;
                    rendered = previewEl.innerHTML || '';
                  }
                } catch(e1) { console.warn('Previewer DOM error:', e1); }
              }
              // Fallback: try getHtml on Cherry instance
              if (!rendered) {
                try { rendered = cherry.getHtml ? cherry.getHtml() : ''; } catch(e2) {}
              }

              // Use fallback if nothing rendered
              if (!rendered || rendered.trim() === '') {
                rendered = renderMarkdownSimple(body);
              }

              if (isMountedRef.current) {
                setHtml(rendered);
                setCache(body, rendered);
                setLoading(false);
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                }
              }
            } catch (e) {
              console.error('Cherry render error:', e);
              if (isMountedRef.current) {
                const fallback = renderMarkdownSimple(body);
                setHtml(fallback);
                setCache(body, fallback);
                setLoading(false);
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                }
              }
            }
          });
        });
      })
      .catch((err) => {
        console.error('Cherry init error:', err);
        if (isMountedRef.current) {
          const fallback = renderMarkdownSimple(body);
          setHtml(fallback);
          setCache(body, fallback);
          setLoading(false);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        }
      });

    // Cleanup timeout on body change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [body]);

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg h-48" />
    );
  }

  return (
    <div
      className="prose prose-gray dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ============================================
// PostDetailContent (unchanged from original)
// ============================================

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

        <PostContent body={post.body} />

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
          <button onClick={() => { const url = window.location.href; navigator.clipboard.writeText(url).then(() => alert('链接已复制')); }}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            <Share2 className="h-5 w-5" />
          </button>
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
            {comments.map((comment) => (
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {relatedPosts.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-gray-900 mb-4">同社区更多文章</h3>
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
