'use client';

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CherryEditor } from '@/components/CherryEditor';
import {
  ArrowLeft, Globe, Lock, Link2, PenLine, FileText, MessageSquareText,
  Home, Plus, X, Tag, Send, Paperclip, Upload, RotateCcw, Clock,
  Maximize2, Minimize2, Save, LogIn, BookOpen, Video, Film, HelpCircle,
  Share2, Gamepad2, AppWindow, Library, BookText,
  File as FileIcon, CircleCheck, CloudUpload, Eye,
} from 'lucide-react';
import { series as seriesApi, getToken, type Series } from '@/lib/api';
import { normalizeModuleType, getModuleLabel } from '@/lib/module-config';

const AUTOSAVE_KEY = 'polis_creation_draft';

// 模块定义 — 每个模块规定了创作方案
interface ModuleDef {
  value: string;
  label: string;
  icon: React.ElementType;
  editor: 'markdown' | 'video' | 'qa';  // 创作方案类型
  desc: string;
}

const MODULE_TYPES: ModuleDef[] = [
  { value: 'forum', label: '交流', icon: MessageSquareText, editor: 'markdown', desc: '发布讨论帖，支持 Markdown 格式' },
  { value: 'video', label: '视频', icon: Film, editor: 'video', desc: '上传视频，支持 MP4/MOV/AVI/MKV/WebM' },
  { value: 'share', label: '分享', icon: Share2, editor: 'markdown', desc: '分享链接、资源或心得体会' },
  { value: 'wiki', label: '知识库', icon: Library, editor: 'markdown', desc: '编写知识库文档，成员可协作编辑' },
  { value: 'qa', label: '问答', icon: HelpCircle, editor: 'qa', desc: '提出问题，等待社区成员回答' },
  { value: 'novel', label: '小说', icon: BookText, editor: 'markdown', desc: '创作小说，支持 Markdown 排版' },
  { value: 'game', label: '游戏', icon: Gamepad2, editor: 'markdown', desc: '发布游戏攻略、评测或资讯' },
  { value: 'mini_app', label: '小程序', icon: AppWindow, editor: 'markdown', desc: '发布小程序介绍与使用说明' },
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
  const prefillType = searchParams.get('type') || ''; // 兼容旧链接 type=video
  const editId = searchParams.get('edit') || ''; // 编辑模式：创作 ID
  const isEditMode = !!editId;

  // 根据 URL 参数确定初始模块（视频需特殊处理旧链接）
  const getInitialModule = (): string => {
    if (prefillModule) return normalizeModuleType(prefillModule);
    if (prefillType === 'video') return 'video';
    return 'forum';
  };

  // ── 模块选择（一级） ──
  const [moduleType, setModuleType] = useState(getInitialModule());
  const currentModule = MODULE_TYPES.find(m => m.value === moduleType) || MODULE_TYPES[0];

  // ── 通用表单 ──
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [password, setPassword] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  // ── 编辑模式数据加载 ──
  const [editLoading, setEditLoading] = useState(!!editId);
  const [editError, setEditError] = useState('');

  // ── Init ──
  useEffect(() => {
    const token = getToken();
    setIsLoggedIn(!!token);
  }, []);

  // 编辑模式：加载已有创作数据
  useEffect(() => {
    if (!editId) return;
    setEditLoading(true);
    const token = getToken();
    fetch(`/api/creations/${editId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json())
      .then((data) => {
        if (data.data) {
          const c = data.data;
          setTitle(c.title || '');
          setBody(c.body || '');
          setTags(Array.isArray(c.tags) ? c.tags.join(', ') : (c.tags || ''));
          setVisibility(c.visibility || 'public');
          setModuleType(normalizeModuleType(c.content_type));
          if (c.password_hash) setPassword('');
          if (c.space_ns && c.module_type) {
            setSubmissions([{ spaceId: c.space_id || '', spaceNs: c.space_ns, spaceTitle: c.space_title || c.space_ns, moduleType: normalizeModuleType(c.module_type) }]);
          }
        } else {
          setEditError(data.message || '加载创作数据失败');
        }
      })
      .catch(() => setEditError('网络错误，无法加载创作数据'))
      .finally(() => setEditLoading(false));
  }, [editId]);

  // ── 草稿 ──
  const [draftRestored, setDraftRestored] = useState(false);
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  // ── 全屏 ──
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── 系列 ──
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [seriesLoading, setSeriesLoading] = useState(false);

  // ── 投稿到社区 ──
  const [submissions, setSubmissions] = useState<SubmissionEntry[]>([]);
  const [spaceQuery, setSpaceQuery] = useState('');
  const [spaceResults, setSpaceResults] = useState<any[]>([]);
  const [spaceLoading, setSpaceLoading] = useState(false);
  const [showSpaceDropdown, setShowSpaceDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── 文件输入 ──
  const mdFileInputRef = useRef<HTMLInputElement>(null);
  const attachFileInputRef = useRef<HTMLInputElement>(null);

  // ── 视频模式 ──
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

  // 从社区链接来的预填充
  useEffect(() => {
    if (prefillSpaceNs && prefillModule) {
      (async () => {
        try {
          const ns = encodeURIComponent(prefillSpaceNs.replace(/\//g, '~'));
          const res = await fetch(`/api/spaces/${ns}`);
          const data = await res.json();
          if (data.code === 0 && data.data) {
            const s = data.data;
            const resolvedModule = normalizeModuleType(prefillModule);
            setSubmissions([{ spaceId: s.id, spaceNs: s.namespace, spaceTitle: s.title, moduleType: resolvedModule }]);
          }
        } catch {}
      })();
    }
  }, [prefillSpaceNs, prefillModule]);

  // 加载系列
  useEffect(() => {
    if (!prefillSpaceNs || currentModule.editor === 'video') return;
    setSeriesLoading(true);
    seriesApi.list(prefillSpaceNs).then(res => {
      if (res.code === 0 && res.data) setSeriesList(res.data.filter((s: Series) => s.is_published));
    }).catch(() => {}).finally(() => setSeriesLoading(false));
  }, [prefillSpaceNs, moduleType]);

  // 草稿恢复（仅 markdown 和 qa 编辑器，非编辑模式）
  useEffect(() => {
    if (draftRestored || currentModule.editor === 'video' || isEditMode) return;
    const draftStr = localStorage.getItem(AUTOSAVE_KEY);
    const draftTime = localStorage.getItem(`${AUTOSAVE_KEY}_time`);
    if (draftStr && draftTime && !body && !title) {
      setShowDraftRestore(true);
      setLastSavedTime(new Date(draftTime).toLocaleString());
      setHasDraft(true);
    }
    setDraftRestored(true);
  }, [draftRestored, body, title, moduleType]);

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

  // 自动保存（仅 markdown/qa 编辑器，非编辑模式）
  const handleAutoSave = useCallback((markdown: string) => {
    if (isEditMode) return;
    const now = new Date();
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ title, body: markdown, tags, moduleType, visibility }));
    localStorage.setItem(`${AUTOSAVE_KEY}_time`, now.toISOString());
    setLastSavedTime(now.toLocaleTimeString());
    setHasDraft(true);
  }, [title, tags, moduleType, visibility, isEditMode]);

  // ── 文件上传 ──
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

  // ── 视频上传 ──
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
        fd.append('content_type', 'video');
        if (videoDesc) fd.append('description', videoDesc.trim());
        if (tags) fd.append('tags', tags);
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

  // ── 社区搜索 ──
  const handleSpaceSearch = (q: string) => {
    setSpaceQuery(q);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!q.trim()) { setSpaceResults([]); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      setSpaceLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}&page_size=8`);
        const data = await res.json();
        if (data.code === 0 && Array.isArray(data.data)) {
          const filtered = data.data.filter((s: any) => {
            const mods = s.enabled_modules;
            if (!mods || !Array.isArray(mods)) return true;
            return mods.includes(moduleType);
          });
          setSpaceResults(filtered);
          setShowSpaceDropdown(true);
        }
      } catch {}
      setSpaceLoading(false);
    }, 300);
  };

  const addSubmission = (space: any) => {
    if (submissions.some(s => s.spaceId === space.id && s.moduleType === moduleType)) return;
    setSubmissions(prev => [...prev, {
      spaceId: space.id, spaceNs: space.namespace,
      spaceTitle: space.title, moduleType,
    }]);
    setSpaceQuery(''); setSpaceResults([]); setShowSpaceDropdown(false);
  };

  const removeSubmission = (spaceId: string, mt: string) => {
    setSubmissions(prev => prev.filter(s => !(s.spaceId === spaceId && s.moduleType === mt)));
  };

  // ── 提交文本（markdown / qa） ──
  const handleSubmitText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) { setError('请输入标题'); return; }
    if (!body.trim()) { setError('请输入内容'); return; }
    setPublishing(true); setError('');
    try {
      const token = localStorage.getItem('polis_access_token');
      const tagList = tags.split(/[,，、\s]+/).filter(Boolean);
      const payload = {
        content_type: moduleType, title: title.trim(), body,
        tags: tagList.length > 0 ? tagList : undefined,
        visibility, password: visibility === 'unlisted' && password ? password : undefined,
      };
      const url = isEditMode ? `/api/creations/${editId}` : '/api/creations';
      const method = isEditMode ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.code === 0 && data.data) {
        const creationId = isEditMode ? editId : data.data.id;
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
        setError(data.message || (isEditMode ? '保存失败' : '创建失败'));
      }
    } catch { setError('网络错误，请重试'); }
    finally { setPublishing(false); }
  };

  // ── 切换模块（编辑模式下不允许切换） ──
  const handleModuleChange = (val: string) => {
    if (isEditMode) return;
    setModuleType(val);
    setError('');
    setSubmissions(prev => []);
  };

  // ── ESC ──
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  const isMarkdownEditor = currentModule.editor === 'markdown' || currentModule.editor === 'qa';

  // ── 全屏编辑器 ──
  if (isFullscreen && isMarkdownEditor) {
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
              {isEditMode ? <><Save className="h-4 w-4" /> {publishing ? '保存中...' : '保存'}</> : <><Send className="h-4 w-4" /> {publishing ? '发布中...' : '发布'}</>}
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

  // ── 主界面 ──
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
            {isMarkdownEditor && lastSavedTime && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><Save className="h-3 w-3" />已保存 {lastSavedTime}</span>
            )}
            {isMarkdownEditor && (
              <button type="button" onClick={() => setIsFullscreen(true)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="全屏编辑">
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
            {isMarkdownEditor ? (
              <button type="button" onClick={handleSubmitText} disabled={publishing || !title.trim() || !body.trim()}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition shadow-lg shadow-primary-600/20">
                {isEditMode ? <><Save size={15} /> {publishing ? '保存中...' : '保存修改'}</> : <><Send size={15} /> {publishing ? '发布中...' : '发布'}</>}
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
          {isEditMode ? '编辑作品' : (prefillSpaceNs ? `在 ${prefillSpaceNs.split('/').slice(-1)[0] || prefillSpaceNs} 发布` : '发布新作品')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {isEditMode ? '修改你的创作内容后保存' : '选择你要发布的模块类型，创作内容后可投稿到任意社区'}
        </p>

        {/* Login prompt */}
        {!isLoggedIn && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 flex items-center justify-between mb-4">
            <span className="text-sm text-amber-700 dark:text-amber-400">请先登录后再发布内容</span>
            <Link href={`/login?redirect=${encodeURIComponent('/creations/new?space=' + encodeURIComponent(prefillSpaceNs) + '&module=' + moduleType)}`}
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

        {/* Edit mode loading */}
        {isEditMode && editLoading && (
          <div className="mx-auto max-w-6xl px-4 py-10 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mx-auto" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded max-w-lg mx-auto" />
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded max-w-2xl mx-auto" />
            </div>
          </div>
        )}

        {/* Edit mode error */}
        {isEditMode && editError && !editLoading && (
          <div className="mx-auto max-w-6xl px-4 py-10 text-center">
            <div className="text-4xl mb-4">😕</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">无法加载创作数据</h2>
            <p className="text-sm text-gray-500 mb-4">{editError}</p>
            <Link href="/creations" className="text-sm text-primary-600 hover:underline">返回内容管理</Link>
          </div>
        )}

        {/* Main form (skip in edit loading/error states) */}
        {!(isEditMode && editLoading) && !(isEditMode && editError) && (<>

        {/* Draft restore */}
        {isMarkdownEditor && showDraftRestore && (
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

        {/* ========== 模块选择（一级 - 决定创作方案） ========== */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {isEditMode ? '当前模块' : '选择发布模块'}
            <span className="text-xs text-gray-400 font-normal">
              {isEditMode ? ' — 编辑模式下不可更改模块类型' : ' — 模块决定创作方式'}
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {MODULE_TYPES.map((mod) => {
              const Icon = mod.icon;
              const isActive = moduleType === mod.value;
              return (
                <button
                  key={mod.value}
                  type="button"
                  onClick={() => handleModuleChange(mod.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-left ${
                    isActive
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    isActive ? 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    <Icon size={20} />
                  </div>
                  <div className="text-center">
                    <div className={`text-sm font-semibold ${isActive ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                      {mod.label}
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{mod.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          {/* ========== 通用设置 (所有模块) ========== */}
          {/* Visibility + Tags */}
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
          {prefillSpaceNs && seriesList.length > 0 && currentModule.editor !== 'video' && (
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

          {/* ========== 投稿到社区（所有模块共用） ========== */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              投稿到社区 <span className="text-xs text-gray-400 font-normal">(可选，可多选 — 仅搜索启用了「{currentModule.label}」模块的社区)</span>
            </label>
            {submissions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {submissions.map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-xs rounded-full">
                    @{s.spaceTitle || s.spaceNs} / {currentModule.label}
                    <button onClick={() => removeSubmission(s.spaceId, s.moduleType)} className="hover:text-red-500"><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 min-w-[80px] justify-center">
                {(() => { const Icon = currentModule.icon; return <Icon size={14} />; })()}
                {currentModule.label}
              </div>
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

          {/* ========== Markdown 编辑器（交流/分享/知识库/小说/游戏/小程序/问答） ========== */}
          {isMarkdownEditor && (
          <>
            {/* 问答提示 */}
            {currentModule.editor === 'qa' && (
              <div className="rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 p-3 flex items-center gap-2 mb-1">
                <HelpCircle className="h-4 w-4 text-cyan-500 shrink-0" />
                <span className="text-sm text-cyan-700 dark:text-cyan-400">
                  请在标题中清晰描述你的问题，正文中补充详细信息和背景。发布后社区成员可以回答你的问题。
                </span>
              </div>
            )}

            {/* Title */}
            <div>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder={currentModule.editor === 'qa' ? '简明扼要地描述你的问题...' : '给你的作品起个标题...'}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-lg font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900 transition-all" />
            </div>

            {/* Editor */}
            <div>
              <CherryEditor value={body} onChange={(m: string) => { setBody(m); handleAutoSave(m); }}
                spaceNs={prefillSpaceNs} height={600} minHeight="400px" />
            </div>

            {/* Toolbar */}
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
                {isEditMode ? <><Save size={16} />{publishing ? '保存中...' : '保存修改'}</> : <><Send size={16} />{publishing ? '发布中...' : '发布作品'}</>}
              </button>
            </div>
          </>
          )}

          {/* ========== 视频编辑器 ========== */}
          {currentModule.editor === 'video' && (
          <>
            {/* Success state */}
            {uploadStatus === 'success' && uploadedVideo && (
              <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-6 text-center">
                <CircleCheck className="h-10 w-10 text-green-500 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">视频上传成功！</h3>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1 mb-4">{uploadedVideo.title} — 正在后台转码中</p>
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
        </>)}
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
