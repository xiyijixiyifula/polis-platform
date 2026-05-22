'use client';

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CherryEditor } from '@/components/CherryEditor';
import {
  ArrowLeft, Globe, Lock, Link2, PenLine, FileText, MessageSquareText,
  Home, Plus, X, Tag, Send, Paperclip, Upload, RotateCcw, Clock,
  Maximize2, Minimize2, Save, LogIn, BookOpen, Image, Video, Film,
  File as FileIcon, CircleCheck, CloudUpload, Eye,
} from 'lucide-react';
import { series as seriesApi, getToken, type Series } from '@/lib/api';

const AUTOSAVE_KEY = 'polis_creation_draft';

const MODULE_TYPES = [
  { value: 'forum', label: '交流', icon: MessageSquareText },
  { value: 'article', label: '文章', icon: FileText },
  { value: 'share', label: '分享', icon: Link2 },
  { value: 'wiki', label: '知识库', icon: FileIcon },
  { value: 'qa', label: '问答', icon: MessageSquareText },
  { value: 'novel', label: '小说', icon: FileText },
  { value: 'game', label: '游戏', icon: Globe },
  { value: 'mini_app', label: '小程序', icon: FileIcon },
];

const SUBMIT_MODULE_TYPES = [
  ...MODULE_TYPES,
  { value: 'video', label: '视频', icon: Video },
];

const VISIBILITY_OPTIONS = [
  { value: 'public', label: '公开', icon: Globe, desc: '所有人可见' },
  { value: 'unlisted', label: '私密分享', icon: Link2, desc: '有链接的人可查看' },
  { value: 'private', label: '仅自己', icon: Lock, desc: '仅自己可见' },
];

interface SubmissionEntry {
  spaceId: string; spaceNs: string; spaceTitle: string; moduleType: string;
}

function NewCreationPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillSpaceNs = searchParams.get('space') || '';
  const prefillModule = searchParams.get('module') || '';
  const prefillContentType = (searchParams.get('type') === 'video') ? 'video' : 'text';

  // ── Content type toggle ──
  const [contentType, setContentType] = useState<'text' | 'video'>(prefillContentType);

  // ── Form state (text) ──
  const [moduleType, setModuleType] = useState(prefillModule || 'forum');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [password, setPassword] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  // ── Draft state ──
  const [draftRestored, setDraftRestored] = useState(false);
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  // ── Fullscreen ──
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Series ──
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [seriesLoading, setSeriesLoading] = useState(false);

  // ── Community submission ──
  const [submissions, setSubmissions] = useState<SubmissionEntry[]>([]);
  const [spaceQuery, setSpaceQuery] = useState('');
  const [spaceResults, setSpaceResults] = useState<any[]>([]);
  const [spaceLoading, setSpaceLoading] = useState(false);
  const [showSpaceDropdown, setShowSpaceDropdown] = useState(false);
  const [selectedSubmitModule, setSelectedSubmitModule] = useState(prefillModule || 'forum');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── File inputs ──
  const mdFileInputRef = useRef<HTMLInputElement>(null);
  const attachFileInputRef = useRef<HTMLInputElement>(null);

  // ── Video mode state ──
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDesc, setVideoDesc] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadedVideo, setUploadedVideo] = useState<{ id: string; title: string } | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // ── Init ──
  useEffect(() => {
    const token = getToken();
    setIsLoggedIn(!!token);
  }, []);

  // Prefill space from community
  useEffect(() => {
    if (prefillSpaceNs && prefillModule) {
      setModuleType(prefillModule);
      setSelectedSubmitModule(prefillModule);
      (async () => {
        try {
          const ns = encodeURIComponent(prefillSpaceNs.replace(/\//g, '~'));
          const res = await fetch(`/api/spaces/${ns}`);
          const data = await res.json();
          if (data.code === 0 && data.data) {
            const s = data.data;
            const mtype = contentType === 'video' ? 'video' : prefillModule;
            setSubmissions([{ spaceId: s.id, spaceNs: s.namespace, spaceTitle: s.title, moduleType: mtype }]);
          }
        } catch {}
      })();
    }
  }, [prefillSpaceNs, prefillModule, contentType]);

  // Load series when space is prefilled (text mode only)
  useEffect(() => {
    if (!prefillSpaceNs || contentType !== 'text') return;
    setSeriesLoading(true);
    seriesApi.list(prefillSpaceNs).then(res => {
      if (res.code === 0 && res.data) setSeriesList(res.data.filter((s: Series) => s.is_published));
    }).catch(() => {}).finally(() => setSeriesLoading(false));
  }, [prefillSpaceNs, contentType]);

  // Draft restore (text mode only)
  useEffect(() => {
    if (draftRestored || contentType !== 'text') return;
    const draftStr = localStorage.getItem(AUTOSAVE_KEY);
    const draftTime = localStorage.getItem(`${AUTOSAVE_KEY}_time`);
    if (draftStr && draftTime && !body && !title) {
      setShowDraftRestore(true);
      setLastSavedTime(new Date(draftTime).toLocaleString());
      setHasDraft(true);
    }
    setDraftRestored(true);
  }, [draftRestored, body, title, contentType]);

  const restoreDraft = () => {
    const draftStr = localStorage.getItem(AUTOSAVE_KEY);
    if (draftStr) {
      try {
        const parsed = JSON.parse(draftStr);
        if (parsed.body) setBody(parsed.body);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.tags) setTags(parsed.tags);
        if (parsed.moduleType) setModuleType(parsed.moduleType);
        if (parsed.visibility) setVisibility(parsed.visibility);
      } catch { setBody(draftStr); }
    }
    setShowDraftRestore(false);
  };

  const discardDraft = () => {
    localStorage.removeItem(AUTOSAVE_KEY);
    localStorage.removeItem(`${AUTOSAVE_KEY}_time`);
    setShowDraftRestore(false);
    setHasDraft(false);
  };

  // ── Auto-save ──
  const handleAutoSave = useCallback((markdown: string) => {
    const now = new Date();
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ title, body: markdown, tags, moduleType, visibility }));
    localStorage.setItem(`${AUTOSAVE_KEY}_time`, now.toISOString());
    setLastSavedTime(now.toLocaleTimeString());
    setHasDraft(true);
  }, [title, tags, moduleType, visibility]);

  // ── File upload handlers ──
  const handleImportMd = async (file: File) => {
    try {
      if (file.name.endsWith('.zip') || file.name.endsWith('.ZIP')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = (e.target?.result as string)?.split(',')[1];
          if (!base64) return;
          const token = localStorage.getItem('polis_access_token');
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = 'Bearer ' + token;
          const res = await fetch('/api/import/markdown', {
            method: 'POST', headers,
            body: JSON.stringify({ filename: file.name, data_base64: base64, mime_type: file.type || 'application/octet-stream' }),
          });
          const data = await res.json();
          if (data.code === 0 && data.data?.content) {
            setBody(prev => prev ? prev + '\n\n' + data.data.content : data.data.content);
          } else { alert('导入失败：' + (data.message || '未知错误')); }
        };
        reader.readAsDataURL(file);
      } else {
        const text = await file.text();
        setBody(prev => prev ? prev + '\n\n' + text : text);
      }
    } catch {}
  };

  const handleAttachmentUpload = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) { alert('文件大小不能超过 8MB'); return; }
    try {
      const token = localStorage.getItem('polis_access_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string)?.split(',')[1];
        if (!base64) return;
        const res = await fetch('/api/upload', {
          method: 'POST', headers,
          body: JSON.stringify({ filename: file.name, data_base64: base64, mime_type: file.type || 'application/octet-stream' }),
        });
        const data = await res.json();
        if (data.code === 0 && data.data?.id) {
          const url = data.data.url || '/api/files/' + data.data.id;
          setBody(prev => prev + '\n[' + file.name + '](' + url + ')');
        }
      };
      reader.readAsDataURL(file);
    } catch {}
  };

  // ── Video upload ──
  const handleVideoUpload = async () => {
    if (!videoFile) { setError('请选择视频文件'); return; }
    if (!title.trim()) { setError('请输入视频标题'); return; }
    setPublishing(true); setError(''); setUploadStatus('uploading'); setUploadProgress(0);
    try {
      const token = localStorage.getItem('polis_access_token');
      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const fd = new FormData();
        fd.append('file', videoFile);
        fd.append('title', title.trim());
        if (videoDesc) fd.append('description', videoDesc.trim());
        fd.append('visibility', visibility);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };

        xhr.onload = () => {
          try {
            const d = JSON.parse(xhr.responseText);
            if (d.code === 0 && d.data) resolve(d.data);
            else reject(new Error(d.message || '上传失败'));
          } catch { reject(new Error('解析响应失败')); }
        };

        xhr.onerror = () => reject(new Error('网络错误'));
        xhr.open('POST', '/api/videos');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(fd);
      });

      // Publish to communities
      if (submissions.length > 0 && result.id) {
        const spaceIds = submissions.map(s => s.spaceId);
        const token = localStorage.getItem('polis_access_token');
        await fetch(`/api/videos/${result.id}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ space_ids: spaceIds }),
        }).catch(() => {});
      }

      setUploadStatus('success');
      setUploadedVideo({ id: result.id, title: result.title || title.trim() });
    } catch (e: any) {
      setError(e.message || '上传失败');
      setUploadStatus('error');
    } finally { setPublishing(false); }
  };

  // ── Community search ──
  const handleSpaceSearch = (q: string) => {
    setSpaceQuery(q);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!q.trim()) { setSpaceResults([]); return; }
    const submitModule = contentType === 'video' ? 'video' : selectedSubmitModule;
    searchTimeoutRef.current = setTimeout(async () => {
      setSpaceLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}&page_size=8`);
        const data = await res.json();
        if (data.code === 0 && Array.isArray(data.data)) {
          const filtered = data.data.filter((s: any) => {
            const mods = s.enabled_modules;
            if (!mods || !Array.isArray(mods)) return true;
            return mods.includes(submitModule);
          });
          setSpaceResults(filtered);
          setShowSpaceDropdown(true);
        }
      } catch {}
      setSpaceLoading(false);
    }, 300);
  };

  const addSubmission = (space: any) => {
    const sm = contentType === 'video' ? 'video' : selectedSubmitModule;
    if (submissions.some(s => s.spaceId === space.id && s.moduleType === sm)) return;
    setSubmissions(prev => [...prev, {
      spaceId: space.id, spaceNs: space.namespace,
      spaceTitle: space.title, moduleType: sm,
    }]);
    setSpaceQuery(''); setSpaceResults([]); setShowSpaceDropdown(false);
  };

  const removeSubmission = (spaceId: string, mt: string) => {
    setSubmissions(prev => prev.filter(s => !(s.spaceId === spaceId && s.moduleType === mt)));
  };

  // ── Submit (text) ──
  const handleSubmitText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) { setError('请输入标题'); return; }
    if (!body.trim()) { setError('请输入内容'); return; }
    setPublishing(true); setError('');
    try {
      const token = localStorage.getItem('polis_access_token');
      const tagList = tags.split(/[,，、\s]+/).filter(Boolean);
      const res = await fetch('/api/creations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          content_type: moduleType, title: title.trim(), body: body,
          tags: tagList.length > 0 ? tagList : undefined,
          visibility, password: visibility === 'unlisted' && password ? password : undefined,
        }),
      });
      const data = await res.json();
      if (data.code === 0 && data.data) {
        const creationId = data.data.id;
        if (selectedSeriesId) {
          try { await seriesApi.addPost(selectedSeriesId, creationId); } catch {}
        }
        if (submissions.length > 0) {
          await Promise.all(submissions.map(sub =>
            fetch(`/api/creations/${creationId}/submit`, {
              method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ creation_id: creationId, space_ns: sub.spaceNs, module_type: sub.moduleType }),
            }).catch(() => {})
          ));
        }
        localStorage.removeItem(AUTOSAVE_KEY);
        localStorage.removeItem(`${AUTOSAVE_KEY}_time`);
        router.push('/creations');
      } else {
        setError(data.message || '创建失败');
      }
    } catch { setError('网络错误，请重试'); }
    finally { setPublishing(false); }
  };

  // ── Fullscreen editor (text only) ──
  if (isFullscreen && contentType === 'text') {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button onClick={() => setIsFullscreen(false)}
              className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0">
              <Minimize2 className="h-5 w-5" />
            </button>
            <input type="text" placeholder="输入标题..."
              className="flex-1 min-w-0 bg-transparent text-lg font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
              value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {lastSavedTime && <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1"><Save className="h-3 w-3" />已保存 {lastSavedTime}</span>}
            <button type="button" onClick={() => setIsFullscreen(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">退出全屏</button>
            <button onClick={handleSubmitText} disabled={publishing || !title.trim() || !body.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50">
              <Send className="h-4 w-4" /> {publishing ? '发布中...' : '发布'}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <CherryEditor value={body} onChange={(m: string) => { setBody(m); handleAutoSave(m); }}
            spaceNs={prefillSpaceNs} height="100%" minHeight="100%" />
        </div>
      </div>
    );
  }

  // ── Main form ──
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 flex gap-6">
      {/* Sidebar */}
      <div className="w-56 shrink-0 hidden md:block">
        <div className="glass-card p-4 sticky top-20">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4 px-2 flex items-center gap-2">
            <Home size={16} className="text-primary-500" />创作者中心
          </h2>
          <nav className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300">
              <PenLine size={18} /><span>发布作品</span>
            </div>
            <Link href="/creations" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
              <FileText size={18} /><span>内容管理</span>
            </Link>
            <Link href="/creations" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
              <MessageSquareText size={18} /><span>互动管理</span>
            </Link>
          </nav>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/creations" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition">
            <ArrowLeft size={18} /> 返回
          </Link>
          <div className="flex items-center gap-2">
            {contentType === 'text' && lastSavedTime && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><Save className="h-3 w-3" />已保存 {lastSavedTime}</span>
            )}
            {contentType === 'text' && (
              <button type="button" onClick={() => setIsFullscreen(true)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="全屏编辑">
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
            {contentType === 'text' ? (
              <button type="button" onClick={handleSubmitText} disabled={publishing || !title.trim() || !body.trim()}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition shadow-lg shadow-primary-600/20">
                <Send size={15} /> {publishing ? '发布中...' : '发布'}
              </button>
            ) : (
              <button type="button" onClick={handleVideoUpload} disabled={publishing || !videoFile || !title.trim() || uploadStatus === 'uploading'}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition shadow-lg shadow-primary-600/20">
                <CloudUpload size={15} /> {uploadStatus === 'uploading' ? `上传中 ${uploadProgress}%` : publishing ? '处理中...' : '上传视频'}
              </button>
            )}
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {prefillSpaceNs ? `在 ${prefillSpaceNs.split('/').slice(-1)[0] || prefillSpaceNs} 发布` : '发布新作品'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          创作内容后可以投稿到你的社区或其他创作者的社区
        </p>

        {/* Login prompt */}
        {!isLoggedIn && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 flex items-center justify-between mb-4">
            <span className="text-sm text-amber-700 dark:text-amber-400">请先登录后再发布内容</span>
            <Link href={`/login?redirect=${encodeURIComponent('/creations/new?space=' + encodeURIComponent(prefillSpaceNs) + (contentType === 'video' ? '&type=video' : ''))}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-colors">
              <LogIn className="h-4 w-4" />去登录
            </Link>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2 mb-4">
            <X className="h-4 w-4 shrink-0" />{error}
          </div>
        )}

        {/* Draft restore (text only) */}
        {contentType === 'text' && showDraftRestore && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 flex items-center justify-between border border-blue-200 dark:border-blue-800 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-blue-700 dark:text-blue-400">
                检测到未发布的草稿
                {lastSavedTime && <span className="text-blue-500 ml-1"><Clock className="h-3 w-3 inline mr-0.5" />{lastSavedTime}</span>}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={restoreDraft}
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 dark:text-blue-400 hover:underline">
                <RotateCcw className="h-3.5 w-3.5" />恢复
              </button>
              <button type="button" onClick={discardDraft}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">丢弃</button>
            </div>
          </div>
        )}

        {/* === Content Type Toggle === */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-5 w-fit">
          <button type="button" onClick={() => { setContentType('text'); setError(''); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              contentType === 'text'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            <PenLine size={16} />图文
          </button>
          <button type="button" onClick={() => { setContentType('video'); setError(''); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              contentType === 'video'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            <Film size={16} />视频
          </button>
        </div>

        <div className="space-y-5">
          {/* ==================== TEXT MODE ==================== */}
          {contentType === 'text' && (
          <>
          {/* Module type */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500 dark:text-gray-400">模块:</span>
            {MODULE_TYPES.map((m) => {
              const Icon = m.icon;
              return (
                <button key={m.value} type="button" onClick={() => setModuleType(m.value)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${moduleType === m.value ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                  <Icon size={12} />{m.label}
                </button>
              );
            })}
          </div>

          {/* Visibility + Password + Tags */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-500 dark:text-gray-400">可见性:</span>
            <select value={visibility}
              onChange={(e) => { setVisibility(e.target.value); if (e.target.value !== 'unlisted') setPassword(''); }}
              className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              {VISIBILITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label} — {opt.desc}</option>)}
            </select>
            {visibility === 'unlisted' && (
              <input type="text" value={password} onChange={(e) => setPassword(e.target.value)}
                className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-transparent w-40"
                placeholder="分享密码（可选）" />
            )}
            <div className="flex items-center gap-1.5 ml-2">
              <Tag size={13} className="text-gray-400" />
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)}
                placeholder="标签 (逗号分隔)" className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-transparent w-44" />
            </div>
          </div>

          {/* Series */}
          {prefillSpaceNs && seriesList.length > 0 && (
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">收录到系列:</span>
              <select value={selectedSeriesId} onChange={(e) => setSelectedSeriesId(e.target.value)}
                className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                <option value="">不收录</option>
                {seriesList.map((s) => <option key={s.id} value={s.id}>{s.title} ({s.post_count || 0}篇)</option>)}
              </select>
              {seriesLoading && <span className="text-xs text-gray-400 animate-pulse">加载系列...</span>}
            </div>
          )}
          </>
          )}

          {/* ==================== COMMUNITY SUBMISSION (shared) ==================== */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              投稿到社区 <span className="text-xs text-gray-400 font-normal">(可选，可多选)</span>
            </label>
            {submissions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {submissions.map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-xs rounded-full">
                    @{s.spaceTitle || s.spaceNs} / {SUBMIT_MODULE_TYPES.find(m => m.value === s.moduleType)?.label || s.moduleType}
                    <button onClick={() => removeSubmission(s.spaceId, s.moduleType)} className="hover:text-red-500"><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              {contentType === 'text' ? (
                <select value={selectedSubmitModule} onChange={(e) => setSelectedSubmitModule(e.target.value)}
                  className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500">
                  {SUBMIT_MODULE_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              ) : (
                <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
                  <Video size={14} /> 视频
                </div>
              )}
              <div className="relative flex-1">
                <input type="text" value={spaceQuery} onChange={(e) => handleSpaceSearch(e.target.value)}
                  onFocus={() => { if (spaceResults.length > 0) setShowSpaceDropdown(true); }}
                  onBlur={() => setTimeout(() => setShowSpaceDropdown(false), 200)}
                  placeholder="搜索社区名称..."
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                {spaceLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">搜索中...</span>}
                {showSpaceDropdown && spaceResults.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg max-h-48 overflow-y-auto">
                    {spaceResults.map((s: any) => (
                      <button key={s.id} type="button" onMouseDown={() => addSubmission(s)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between">
                        <div><span className="font-medium text-gray-900 dark:text-white">{s.title || s.namespace}</span>
                          <span className="text-xs text-gray-400 ml-2">@{s.namespace}</span></div>
                        <Plus size={14} className="text-primary-500" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ==================== TEXT MODE: Title + Editor + Toolbar ==================== */}
          {contentType === 'text' && (
          <>
          {/* Title */}
          <div>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="给你的作品起个标题..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-lg font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900 transition-all" />
          </div>

          {/* CherryEditor */}
          <div>
            <CherryEditor value={body} onChange={(m: string) => { setBody(m); handleAutoSave(m); }}
              spaceNs={prefillSpaceNs} height={600} minHeight="400px" />
          </div>

          {/* Toolbar row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <input ref={attachFileInputRef} type="file" className="hidden" onChange={e => {
                const f = e.target.files?.[0]; if (f) handleAttachmentUpload(f); e.target.value = '';
              }} />
              <button type="button" onClick={() => attachFileInputRef.current?.click()}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">
                <Paperclip className="h-3.5 w-3.5" />附件
              </button>
              <input ref={mdFileInputRef} type="file" accept=".md,.zip" className="hidden" onChange={e => {
                const f = e.target.files?.[0]; if (f) handleImportMd(f); e.target.value = '';
              }} />
              <button type="button" onClick={() => mdFileInputRef.current?.click()}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">
                <Upload className="h-3.5 w-3.5" />导入 MD
              </button>
              <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
                支持 Markdown：标题、粗体、代码、表格、图片拖拽
              </p>
              {hasDraft && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <Save className="h-3 w-3" />{lastSavedTime ? `已保存 ${lastSavedTime}` : '已自动保存'}
                </span>
              )}
            </div>
            <button type="button" onClick={handleSubmitText} disabled={publishing || !title.trim() || !body.trim()}
              className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition shadow-lg shadow-primary-600/20">
              <Send size={16} />{publishing ? '发布中...' : '发布作品'}
            </button>
          </div>
          </>
          )}

          {/* ==================== VIDEO MODE ==================== */}
          {contentType === 'video' && (
          <>
          {/* Success state */}
          {uploadStatus === 'success' && uploadedVideo && (
            <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-6 text-center">
              <CircleCheck className="h-10 w-10 text-green-500 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">视频上传成功！</h3>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1 mb-4">
                {uploadedVideo.title} — 正在后台转码中
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link href={`/video/${uploadedVideo.id}`}
                  className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
                  <Eye size={16} />查看视频
                </Link>
                <button type="button" onClick={() => {
                  setUploadStatus('idle'); setUploadedVideo(null); setTitle('');
                  setVideoDesc(''); setVideoFile(null); setSubmissions([]);
                }}
                  className="inline-flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  继续上传
                </button>
              </div>
            </div>
          )}

          {/* Upload form */}
          {uploadStatus !== 'success' && (
          <>
          {/* File drop zone */}
          <div
            onClick={() => videoFileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault(); e.stopPropagation();
              const f = e.dataTransfer.files?.[0];
              if (f && f.type.startsWith('video/')) setVideoFile(f);
            }}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              videoFile
                ? 'border-primary-400 bg-primary-50/50 dark:bg-primary-900/10'
                : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
            }`}>
            <input ref={videoFileInputRef} type="file" accept="video/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setVideoFile(f); e.target.value = ''; }} />
            {videoFile ? (
              <div>
                <Video className="h-10 w-10 mx-auto text-primary-500 mb-3" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">{videoFile.name}</p>
                <p className="text-xs text-gray-400 mt-1">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                <button type="button" onClick={(e) => { e.stopPropagation(); setVideoFile(null); }}
                  className="text-xs text-red-500 hover:underline mt-2">移除</button>
              </div>
            ) : (
              <div>
                <CloudUpload className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">点击或拖拽视频文件到此处</p>
                <p className="text-xs text-gray-400 mt-1">支持 MP4 / MOV / AVI / MKV / WebM，最大 600MB</p>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="视频标题..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-lg font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900 transition-all" />
          </div>

          {/* Description */}
          <div>
            <textarea value={videoDesc} onChange={(e) => setVideoDesc(e.target.value)}
              rows={3} placeholder="视频描述（可选）..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900 transition-all resize-none" />
          </div>

          {/* Visibility */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-500 dark:text-gray-400">可见性:</span>
            {VISIBILITY_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button key={opt.value} type="button" onClick={() => { setVisibility(opt.value); if (opt.value !== 'unlisted') setPassword(''); }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs border transition-colors ${
                    visibility === opt.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                  }`}>
                  <Icon size={14} />
                  <div className="text-left"><div className="font-medium">{opt.label}</div><div className="text-[10px] opacity-70">{opt.desc}</div></div>
                </button>
              );
            })}
            {visibility === 'unlisted' && (
              <input type="text" value={password} onChange={(e) => setPassword(e.target.value)}
                className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-transparent w-40"
                placeholder="分享密码（可选）" />
            )}
          </div>

          {/* Upload progress */}
          {uploadStatus === 'uploading' && (
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                <span>上传中...</span><span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}
          </>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewCreationPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 text-center text-gray-500">加载中...</div>}>
      <NewCreationPageInner />
    </Suspense>
  );
}