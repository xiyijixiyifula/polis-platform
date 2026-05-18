'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Heart, MessageCircle, Eye, Share2, ArrowLeft } from 'lucide-react';
import { videos, type VideoItem, type VideoComment } from '@/lib/api';
import { formatCount, formatDate } from '@/lib/utils';

/** 视频详情页 — HLS 播放 + 互动 */
export default function VideoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const videoId = params.id as string;
  const spaceNs = searchParams.get('space') || '';

  const [video, setVideo] = useState<VideoItem | null>(null);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [liking, setLiking] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoId) return;
    videos.get(videoId).then(res => {
      if (res.code === 0 && res.data) setVideo(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
    videos.getComments(videoId).then(res => {
      if (res.code === 0 && res.data) setComments(res.data);
    }).catch(() => {});
  }, [videoId]);

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

  const handleComment = async () => {
    if (!commentBody.trim() || !video) return;
    try {
      const res = await videos.createComment(video.id, commentBody.trim());
      if (res.code === 0 && res.data) { setComments(prev => [...prev, res.data!]); setCommentBody(''); }
    } catch {}
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">加载中...</div>;
  if (!video) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">视频不存在或已被删除</div>;

  const fmtDur = (s: number | null) => {
    if (!s) return ''; const m = Math.floor(s / 60); const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link href={spaceNs ? `/space/${spaceNs}/video` : '/'}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4">
        <ArrowLeft className="h-4 w-4" />返回
      </Link>

      {/* 播放器 */}
      <div className="card overflow-hidden p-0">
        {video.hls_url ? (
          <video ref={videoRef} controls className="w-full aspect-video bg-black" poster={video.thumbnail_url || undefined}>
            <source src={video.hls_url} type="application/x-mpegURL" />
          </video>
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

      {/* 信息 */}
      <div className="mt-4 card">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">{video.title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{video.description || '暂无描述'}</p>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Link href={`/profile/${video.uploader.username}`} className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-medium">
              {video.uploader.display_name?.charAt(0) || '?'}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{video.uploader.display_name}</p>
              <p className="text-xs text-gray-400">@{video.uploader.username}</p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <button onClick={handleLike}
              className={`flex items-center gap-1 text-sm transition-colors ${video.is_liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
              <Heart className={`h-5 w-5 ${video.is_liked ? 'fill-current' : ''}`} />{formatCount(video.like_count)}
            </button>
            <span className="flex items-center gap-1 text-sm text-gray-500"><MessageCircle className="h-5 w-5" />{formatCount(video.comment_count)}</span>
            <span className="flex items-center gap-1 text-sm text-gray-500"><Eye className="h-5 w-5" />{formatCount(video.view_count)}</span>
            {video.visibility === 'unlisted' && video.share_code && (
              <button onClick={() => { navigator.clipboard.writeText(`${location.origin}/video/share/${video.share_code}`); alert('分享链接已复制'); }}
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"><Share2 className="h-5 w-5" />复制链接</button>
            )}
          </div>
        </div>
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
