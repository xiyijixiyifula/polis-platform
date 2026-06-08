'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { MessageCircle, Eye, Heart, Pin, Trash2 } from 'lucide-react';
import { getToken } from '@/lib/api';

interface Comment {
  id: string;
  body?: string;
  content?: string;
  author?: {
    username?: string;
    display_name?: string;
    id?: string;
  };
  created_at: string;
  is_pinned?: boolean;
  like_count?: number;
}

export default function CommentsSection() {
  const [commentPosts, setCommentPosts] = useState<any[]>([]);
  const [commentPostsLoading, setCommentPostsLoading] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [commentsPostFilter, setCommentsPostFilter] = useState('');

  const filteredCommentPosts = useMemo(() => {
    if (!commentsPostFilter.trim()) return commentPosts;
    const q = commentsPostFilter.toLowerCase();
    return commentPosts.filter((p: any) => (p.title || '').toLowerCase().includes(q));
  }, [commentPosts, commentsPostFilter]);

  const selectedPost = useMemo(
    () => commentPosts.find((p: any) => p.id === selectedPostId) || null,
    [commentPosts, selectedPostId],
  );

  const loadCommentPosts = async () => {
    setCommentPostsLoading(true);
    try {
      const token = getToken() || '';
      const res = await fetch('/api/my/contents?page=1&page_size=100', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      const items = Array.isArray(data.data) ? data.data
        : Array.isArray(data.data?.items) ? data.data.items : [];
      setCommentPosts(items);
    } catch (e) { console.error('[CommentsSection] loadCommentPosts error:', e); } finally { setCommentPostsLoading(false); }
  };

  const loadComments = async (reset = false) => {
    setCommentsLoading(true);
    try {
      const page = reset ? 1 : commentsPage;
      const token = getToken() || '';
      const params = new URLSearchParams({ page: String(page), page_size: '30', post_id: selectedPostId! });
      const res = await fetch(`/api/creator/comments?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      const list = Array.isArray(data.data) ? data.data
        : Array.isArray(data.data?.items) ? data.data.items : [];
      if (reset) {
        setComments(list);
        setCommentsPage(1);
      } else {
        setComments(prev => [...prev, ...list]);
      }
      setCommentsTotal(data.total ?? data.data?.total ?? 0);
    } catch (e) { console.error('[CommentsSection] loadComments error:', e); } finally { setCommentsLoading(false); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return;
    try {
      const token = getToken() || '';
      await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (e) { console.error('[CommentsSection] handleDeleteComment error:', e); }
  };

  const handleTogglePin = async (comment: Comment) => {
    try {
      const token = getToken() || '';
      const res = await fetch(`/api/comments/${comment.id}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ pin: !comment.is_pinned }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setComments(prev => prev.map(c => c.id === comment.id ? { ...c, is_pinned: !c.is_pinned } : c));
      }
    } catch (e) { console.error('[CommentsSection] handleTogglePin error:', e); }
  };

  const selectCommentPost = (post: any) => {
    setSelectedPostId(post.id);
    setComments([]);
    setCommentsPage(1);
  };

  useEffect(() => {
    loadCommentPosts();
    setSelectedPostId(null);
    setComments([]);
  }, []);

  useEffect(() => {
    if (selectedPostId) {
      loadComments(true);
    }
  }, [selectedPostId]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">评论管理</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        管理你作品下的所有评论，支持置顶和删除
      </p>

      <div className="flex gap-6">
        <div className="w-72 shrink-0">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">我的作品</h3>
              <span className="text-xs text-gray-400">{commentPosts.length}篇</span>
            </div>
            <input
              type="text"
              placeholder="搜索作品标题..."
              value={commentsPostFilter}
              onChange={(e) => setCommentsPostFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 mb-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {commentPostsLoading ? (
              <div className="text-center py-8">
                <div className="h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs text-gray-400"><span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2 align-middle"></span>加载中...</span>
              </div>
            ) : filteredCommentPosts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-gray-400">📝 暂无作品</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {filteredCommentPosts.map((post: any) => (
                  <button
                    key={post.id}
                    onClick={() => selectCommentPost(post)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      selectedPost?.id === post.id
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="font-medium truncate">{post.title || '无标题'}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      <MessageCircle size={10} /> {post.comment_count || 0}
                      <Eye size={10} className="ml-1" /> {post.view_count || 0}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {selectedPost === null ? (
            <div className="glass-card p-12 text-center">
              <MessageCircle size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">选择左侧作品查看评论</h3>
              <p className="text-sm text-gray-500">点击左侧任意作品，查看并管理该作品下的所有评论</p>
            </div>
          ) : commentsLoading ? (
            <div className="glass-card p-12 text-center">
              <div className="h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-sm text-gray-400">加载评论...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <MessageCircle size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">💬 暂无评论</h3>
              <p className="text-sm text-gray-500">💬 这件作品还没有收到评论，来说两句吧</p>
            </div>
          ) : (
            <div className="glass-card overflow-hidden rounded-xl">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  评论列表共 {comments.length} 条
                </h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[65vh] overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <div className="flex items-start gap-3">
                      <Link href={`/profile/${comment.author?.username || comment.author?.id || '#'}`} className="shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold">
                          {(comment.author?.display_name || comment.author?.username || '?').charAt(0)}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link href={`/profile/${comment.author?.username || comment.author?.id || '#'}`} className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary-600 transition-colors">
                            {comment.author?.display_name || comment.author?.username || '匿名'}
                          </Link>
                          <span className="text-xs text-gray-400">
                            {(() => {
                              const d = new Date(comment.created_at);
                              return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                            })()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                          {comment.body || comment.content || ''}
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            onClick={() => handleTogglePin(comment)}
                            className={`text-xs flex items-center gap-1 ${
                              comment.is_pinned
                                ? 'text-primary-600 dark:text-primary-400'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                          >
                            <Pin size={12} />
                            {comment.is_pinned ? '已置顶' : '置顶评论'}
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"
                          >
                            <Trash2 size={12} />
                            删除评论
                          </button>
                          <span className="text-xs text-gray-300 dark:text-gray-600 ml-auto flex items-center gap-1">
                            <Heart size={10} /> {comment.like_count || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
