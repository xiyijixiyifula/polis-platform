'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, Globe, Lock, Link2 } from 'lucide-react';
import { VideoCard } from './VideoCard';
import { videos, type VideoItem } from '@/lib/api';

interface SpaceVideoTabProps {
  namespace: string;
  isOwner: boolean;
}

/** 空间视频 Tab — 小红书风格网格展示 + 上传 */
export function SpaceVideoTab({ namespace, isOwner }: SpaceVideoTabProps) {
  const [videoList, setVideoList] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all'|'public'|'private'>('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadVis, setUploadVis] = useState<'public'|'private'|'unlisted'>('public');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 加载视频列表
  useEffect(() => {
    videos.list(namespace).then(res => {
      if (res.code === 0 && res.data) setVideoList(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [namespace]);

  const filtered = videoList.filter(v => {
    if (filter === 'public') return v.visibility === 'public';
    if (filter === 'private') return v.visibility === 'private' || v.visibility === 'unlisted';
    return true;
  });

  const handleUpload = async () => {
    if (!selectedFile || !uploadTitle.trim()) { alert('请选择视频文件并填写标题'); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // 去掉 data:video/mp4;base64, 前缀
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });
      const res = await videos.upload(namespace, base64, uploadTitle.trim(), uploadDesc, uploadVis, selectedFile.name.split('.').pop());
      if (res.code === 0 && res.data) {
        setVideoList(prev => [res.data as unknown as VideoItem, ...prev]);
        setShowUpload(false);
        setUploadTitle(''); setUploadDesc(''); setSelectedFile(null);
      } else {
        alert(res.message || '上传失败');
      }
    } catch (e: any) {
      alert(e.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mt-2 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 上传 + 筛选 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {isOwner && (
          <button onClick={() => setShowUpload(!showUpload)}
            className="card flex items-center gap-3 hover:border-primary-400 transition-colors group py-3 px-4">
            <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-red-400 to-pink-600 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">发布视频</p>
              <p className="text-xs text-gray-400">支持 MP4/MOV/AVI/MKV 等格式</p>
            </div>
          </button>
        )}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          {[
            { key: 'all' as const, label: '全部', icon: null },
            { key: 'public' as const, label: '公开', icon: Globe },
            { key: 'private' as const, label: '私密', icon: Lock },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === key ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
              {Icon && <Icon className="h-3 w-3" />}{label}
            </button>
          ))}
        </div>
      </div>

      {/* 上传表单 */}
      {showUpload && (
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">发布新视频</h3>
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-primary-400 transition-colors cursor-pointer">
            <input ref={fileRef} type="file" accept="video/*" className="hidden"
              onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
            {selectedFile ? (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-xs text-gray-400 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <><Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">点击选择视频文件</p>
              <p className="text-xs text-gray-400 mt-1">最大 500MB</p></>
            )}
          </div>
          <input type="text" placeholder="视频标题" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 text-sm dark:bg-gray-800 dark:text-white" />
          <textarea placeholder="视频描述（可选）" value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} rows={2}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 text-sm dark:bg-gray-800 dark:text-white resize-none" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">可见性：</span>
            {([
              { k: 'public' as const, l: '公开', d: '所有人可见', i: Globe },
              { k: 'unlisted' as const, l: '私密分享', d: '有链接的人可查看', i: Link2 },
              { k: 'private' as const, l: '私有', d: '仅自己可见', i: Lock },
            ]).map(({ k, l, d, i: I }) => (
              <button key={k} onClick={() => setUploadVis(k)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${uploadVis === k ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
                <I className="h-3.5 w-3.5" /><div className="text-left"><div className="font-medium">{l}</div><div className="text-[10px] opacity-70">{d}</div></div>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleUpload} disabled={uploading || !selectedFile || !uploadTitle.trim()}
              className="btn-primary text-sm px-5 py-2 disabled:opacity-50">{uploading ? '上传中...' : '发布视频'}</button>
            <button onClick={() => setShowUpload(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">取消</button>
          </div>
        </div>
      )}

      {/* 视频网格 */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(v => <VideoCard key={v.id} video={v} namespace={namespace} size="sm" />)}
        </div>
      ) : (
        <div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500">
          <Upload className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>暂无视频</p>
          {isOwner && <p className="text-sm mt-1">上传第一个视频吧！</p>}
        </div>
      )}
    </div>
  );
}
