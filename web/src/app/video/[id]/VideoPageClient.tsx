'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Eye, Share2, ArrowLeft, Bookmark, Globe, Lock, Link2 } from 'lucide-react';
import { videos, type VideoItem, type VideoComment } from '@/lib/api';
import { formatCount, formatDate } from '@/lib/utils';

/** 视频详情页 — HLS 播放 + 互动 + 收藏 */
export default function VideoPage({ videoId, spaceNs = '' }: { videoId: string; spaceNs?: string }) {

  const [video, setVideo] = useState<VideoItem | null>(null);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [liking, setLiking] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoId) return;
    setLoading(true);
    Promise.all([
      videos.get(videoId),
      videos.getComments(videoId),
    ]).then(([vRes, cRes]) => {
      if (vRes.code === 0 && vRes.data) {
        setVideo(vRes.data);
        setIsBookmarked(vRes.data.is_bookmarked || false);
      }
      if (cRes.code === 0 && cRes.data) setComments(Array.isArray(cRes.data) ? cRes.data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [videoId]);

  // HLS.js 初始化 — 动态导入避免 SSR 中 window is not defined
  useEffect(() => {
    if (!video?.hls_url || !videoRef.current) return;
    let cancelled = false;
    const videoEl = videoRef.current;
    const src = video.hls_url;

    import('hls.js').then(({ default: Hls }) => {
      if (cancelled || !videoEl) return;
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: false });
        hls.loadSource(src);
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                break;
            }
          }
        });
      } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = src;
      }
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [video?.hls_url]);

  const handleLike = async () => {
    if (liking || !video) return;
    setLiking(true);
    try {
      const res = await videos.toggleLike(video.id);
      if (res.code === 0) {
        setVideo(prev => prev ? { ...prev, is_liked: !prev.is_liked, like_count: prev.is_liked ? prev.like_count - 1 : prev.like_count + 1 } : null);
      }
    } catch {}
    setLiking(false);
  };

  const handleBookmark = async () => {
    if (bookmarking || !video) return;
    setBookmarking(true);
    try {
      const res = await videos.toggleBookmark(video.id);
      if (res.code === 0) {
        setIsBookmarked(res.data as unknown as boolean);
      }
    } catch {}
    setBookmarking(false);
  };

  const handleComment = async () => {
    if (!commentBody.trim() || !video) return;
    try {
      const res = await videos.createComment(video.id, commentBody.trim());
      if (res.code === 0 && res.data) {
        setComments(prev => [...prev, res.data!]);
        setVideo(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : null);
        setCommentBody('');
      }
    } catch {}
  };

  const handleShare = () => {
    if (!video) return;
    const url = video.share_code
      ? `${location.origin}/share/${video.share_code}`
      : `${location.origin}/video/${video.id}`;
    navigator.clipboard.writeText(url).then(() => alert('链接已复制到剪贴板'));
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">加载中...</div>;
  if (!video) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">视频不存在或已被删除</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link href={spaceNs ? `/space/${spaceNs}/video` : '/'}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4">
        <ArrowLeft className="h-4 w-4" />返回
      </Link>

      {/* 播放器 */}
      <div className="card overflow-hidden p-0 rounded-xl">
        {video.hls_url ? (
          <video ref={videoRef} controls className="w-full aspect-video bg-black" poster={video.thumbnail_url || undefined}
            playsInline crossOrigin="anonymous" />
        ) : video.status === 'processing' ? (
          <div className="w-full aspect-video bg-gray-900 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="animate-spin h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p>视频处理中，请稍后再试</p>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-video bg-gray-900 flex items-center justify-center">
            <p className="text-gray-400">视频转码失败</p>
          </div>
        )}
      </div>

      {/* 信息 & 互动 */}
      <div className="mt-4 card">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">{video.title}</h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            video.visibility === 'public' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
            video.visibility === 'unlisted' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
            'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          }`}>
            {video.visibility === 'public' ? <Globe className="h-3 w-3 inline mr-0.5" /> : video.visibility === 'unlisted' ? <Link2 className="h-3 w-3 inline mr-0.5" /> : <Lock className="h-3 w-3 inline mr-0.5" />}
            {video.visibility === 'public' ? '公开' : video.visibility === 'unlisted' ? '分享' : '私有'}
          </span>
          <span className="text-xs text-gray-400">{formatDate(video.created_at)}</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{video.description || '暂无描述'}</p>

        {/* 互动按钮 */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex-wrap gap-3">
          <Link href={`/profile/${video.uploader.username}`} className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-medium">
              {video.uploader.display_name?.charAt(0) || '?'}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{video.uploader.display_name}</p>
              <p className="text-xs text-gray-400">@{video.uploader.username}</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={handleLike}
              className={`flex items-center gap-1 text-sm transition-colors ${video.is_liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
              <Heart className={`h-5 w-5 ${video.is_liked ? 'fill-current' : ''}`} />{formatCount(video.like_count)}
            </button>
            <button onClick={handleBookmark} disabled={bookmarking}
              className={`flex items-center gap-1 text-sm transition-colors ${isBookmarked ? 'text-amber-500' : 'text-gray-500 hover:text-amber-500'}`}>
              <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
            <span className="flex items-center gap-1 text-sm text-gray-500"><MessageCircle className="h-5 w-5" />{formatCount(video.comment_count)}</span>
            <span className="flex items-center gap-1 text-sm text-gray-500"><Eye className="h-5 w-5" />{formatCount(video.view_count)}</span>
            <button onClick={handleShare} className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
              <Share2 className="h-5 w-5" />分享
            </button>
          </div>
        </div>

        {/* 发布到的社区 */}
        {video.published_spaces && video.published_spaces.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">发布到的社区</h4>
            <div className="flex flex-wrap gap-1.5">
              {video.published_spaces.map((sp: any) => (
                <Link key={sp.space_id} href={`/space/${encodeURIComponent(sp.namespace)}`}
                  className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600">
                  {sp.title}
                  {sp.review_status === 'pending' && <span className="ml-1 text-amber-500">(审核中)</span>}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 评论 */}
      <div className="mt-4 card">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">评论 ({video.comment_count})</h3>
        <div className="flex gap-2 mb-4">
          <input type="text" placeholder="写下你的评论..." value={commentBody}
            onChange={e => setCommentBody(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleComment()}
            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 text-sm dark:bg-gray-800 dark:text-white" />
          <button onClick={handleComment} className="btn-primary text-sm px-4">发送</button>
        </div>
        <div className="space-y-3">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-medium shrink-0">
                {c.author?.display_name?.charAt(0) || '?'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{c.author?.display_name}</span>
                  <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{c.body}</p>
              </div>
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-gray-400 text-center py-4">暂无评论，来说两句吧</p>}
        </div>
      </div>
    </div>
  );
}
