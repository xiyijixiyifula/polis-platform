'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CherryEditor } from '@/components/CherryEditor';
import {
  ArrowLeft,
  Send,
  LogIn,
  BookOpen,
  RotateCcw,
  Paperclip,
  Upload,
  Maximize2,
  Minimize2,
  Save,
  X,
  FileText,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { posts, series, getToken, type Series } from '@/lib/api';
import { loadModules, type SpaceModules } from '@/components/SpaceSettings';

const AUTOSAVE_KEY = (space: string) => `polis_draft_${space}`;

function NewPostForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const space = searchParams.get('space') || '';
  const urlModule = searchParams.get('module') || '';

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [importingMd, setImportingMd] = useState(false);
  const mdFileInputRef = useRef<HTMLInputElement>(null);
  const attachFileInputRef = useRef<HTMLInputElement>(null);

  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [seriesLoading, setSeriesLoading] = useState(false);

  const enabledModules = useMemo(() => {
    if (!space) return null;
    return loadModules(space);
  }, [space]);

  const availableModules = useMemo(() => {
    const all: { id: string; label: string; moduleKey: keyof SpaceModules }[] = [
      { id: 'article', label: '交流', moduleKey: 'posts' as const },
      { id: 'share', label: '分享', moduleKey: 'share' as const },
      { id: 'wiki', label: '知识库', moduleKey: 'wiki' as const },
      { id: 'qa', label: '问答', moduleKey: 'qa' as const },
    ];
    if (!enabledModules) return all;
    return all.filter((m) => enabledModules[m.moduleKey]);
  }, [enabledModules]);

  const [moduleType, setModuleType] = useState(urlModule === 'share' ? 'share' : urlModule === 'wiki' ? 'wiki' : urlModule === 'forum' ? 'article' : 'article');
  useEffect(() => {
    if (
      availableModules.length > 0 &&
      !availableModules.find((m) => m.id === moduleType)
    ) {
      setModuleType(availableModules[0].id);
    }
  }, [availableModules, moduleType]);

  useEffect(() => {
    const token = getToken();
    setIsLoggedIn(!!token);
  }, []);

  useEffect(() => {
    if (!space) return;
    setSeriesLoading(true);
    series
      .list(space)
      .then((res) => {
        if (res.code === 0 && res.data) {
          setSeriesList(res.data.filter((s) => s.is_published));
        }
      })
      .catch(() => {})
      .finally(() => setSeriesLoading(false));
  }, [space]);

  useEffect(() => {
    if (!space) return;
    const draft = localStorage.getItem(AUTOSAVE_KEY(space));
    const draftTime = localStorage.getItem(`${AUTOSAVE_KEY(space)}_time`);
    if (draft && draftTime && !body) {
      setShowDraftRestore(true);
      setLastSavedTime(new Date(draftTime).toLocaleString());
      setHasDraft(true);
    }
  }, [space, body]);

  const restoreDraft = () => {
    if (!space) return;
    const draft = localStorage.getItem(AUTOSAVE_KEY(space));
    if (draft) {
      setBody(draft);
    }
    setShowDraftRestore(false);
  };

  const discardDraft = () => {
    if (!space) return;
    localStorage.removeItem(AUTOSAVE_KEY(space));
    localStorage.removeItem(`${AUTOSAVE_KEY(space)}_time`);
    setShowDraftRestore(false);
    setHasDraft(false);
  };

  const handleImportMd = async (file: File) => {
    setImportingMd(true);
    try {
      if (file.name.endsWith('.zip') || file.name.endsWith('.ZIP')) {
        // ZIP files: send to backend for extraction
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = (e.target?.result as string)?.split(',')[1];
          if (!base64) { setImportingMd(false); return; }
          const token = localStorage.getItem('polis_access_token');
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = 'Bearer ' + token;
          const res = await fetch('/api/import/markdown', {
            method: 'POST', headers,
            body: JSON.stringify({ filename: file.name, data_base64: base64, mime_type: file.type || 'application/octet-stream' }),
          });
          const data = await res.json();
          if (data.code === 0 && data.data?.content) {
            setBody(data.data.content);
          } else {
            alert('导入失败：' + (data.message || '未知错误'));
          }
          setImportingMd(false);
        };
        reader.readAsDataURL(file);
      } else {
        // .md files: read directly as text (skip backend)
        const text = await file.text();
        setBody(text);
        setImportingMd(false);
      }
    } catch { setImportingMd(false); }
  };

  const handleAttachmentUpload2 = async (file: File) => {
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
          // Insert as markdown link at cursor position - use a prompt
          const linkText = '[' + file.name + '](' + url + ')';
          setBody(prev => prev + "\n" + linkText);
        }
      };
      reader.readAsDataURL(file);
    } catch {}
  };

  const handleAutoSave = useCallback((markdown: string) => {
    setLastSavedTime(new Date().toLocaleTimeString());
    setHasDraft(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!space) {
      setError('请指定要发布的社区');
      return;
    }
    setPublishing(true);
    setError('');

    try {
      const res = await posts.create(space, {
        title: title.trim(),
        body: body,
        module_type: moduleType,
        tags: tags.split(/[,，、\s]+/).filter(Boolean),
      });
      if (res.code === 0 && res.data?.id) {
        const postId = res.data.id;
        if (selectedSeriesId) {
          try {
            await series.addPost(selectedSeriesId, postId);
          } catch {
            console.warn('Series association failed, but post was created');
          }
        }
        if (space) {
          localStorage.removeItem(AUTOSAVE_KEY(space));
          localStorage.removeItem(`${AUTOSAVE_KEY(space)}_time`);
        }
        router.push(`/post/${postId}?space=${encodeURIComponent(space)}`);
      } else {
        setError(res.message || '发布失败');
      }
    } catch (err: any) {
      const msg = err?.message || '网络错误，请重试';
      if (
        msg.includes('Authentication') ||
        msg.includes('401') ||
        msg.includes('Unauthorized')
      ) {
        setError('请先登录后再发布');
      } else {
        setError(msg);
      }
    } finally {
      setPublishing(false);
    }
  };

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setIsFullscreen(false)}
              className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
            >
              <Minimize2 className="h-5 w-5" />
            </button>
            <input
              type="text"
              placeholder="输入帖子标题..."
              className="flex-1 min-w-0 bg-transparent text-lg font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {lastSavedTime && (
              <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <Save className="h-3 w-3" />
                已保存 {lastSavedTime}
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              退出全屏
            </button>
            <button
              onClick={handleSubmit}
              disabled={publishing || !title.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {publishing ? '发布中...' : '发布'}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <CherryEditor
            value={body}
            onChange={setBody}
            spaceNs={space}
            height="100%"
            minHeight="100%"
            autoSaveKey={space ? AUTOSAVE_KEY(space) : undefined}
            onAutoSave={handleAutoSave}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={space ? `/space/${space}` : '/'}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              发布新帖
            </h1>
            {space && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                发布到 /{space}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastSavedTime && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Save className="h-3 w-3" />
              已保存 {lastSavedTime}
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="全屏编辑"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <X className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {!isLoggedIn && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 flex items-center justify-between">
            <span className="text-sm text-amber-700 dark:text-amber-400">
              请先登录后再发布内容
            </span>
            <Link
              href={`/login?redirect=${encodeURIComponent(
                `/post/new?space=${encodeURIComponent(space)}`
              )}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              <LogIn className="h-4 w-4" />
              去登录
            </Link>
          </div>
        )}

        {showDraftRestore && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 flex items-center justify-between border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-blue-700 dark:text-blue-400">
                检测到未发布的草稿
                {lastSavedTime && (
                  <span className="text-blue-500 dark:text-blue-500 ml-1">
                    <Clock className="h-3 w-3 inline mr-0.5" />
                    {lastSavedTime}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={restoreDraft}
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 dark:text-blue-400 hover:underline"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                恢复
              </button>
              <button
                type="button"
                onClick={discardDraft}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                丢弃
              </button>
            </div>
          </div>
        )}

        {!space && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              社区命名空间 *
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="如: polis 或 zhangsan/rust-lab"
              value={space}
              readOnly
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              请从社区页面点击发帖按钮进入，或在上方 URL 中添加 ?space=命名空间
            </p>
          </div>
        )}

        {availableModules.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              模块:
            </span>
            {availableModules.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModuleType(m.id)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  moduleType === m.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
        {availableModules.length <= 1 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            发布帖子
          </p>
        )}

        {space && seriesList.length > 0 && (
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              收录到系列:
            </span>
            <select
              value={selectedSeriesId}
              onChange={(e) => setSelectedSeriesId(e.target.value)}
              className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">不收录</option>
              {seriesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.post_count || 0}篇)
                </option>
              ))}
            </select>
            {seriesLoading && (
              <span className="text-xs text-gray-400 animate-pulse">
                加载系列...
              </span>
            )}
          </div>
        )}

        <input
          type="text"
          placeholder="输入帖子标题..."
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-lg font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900 transition-all"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="标签 (用逗号分隔)"
          className="input-field"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />

        <CherryEditor
          value={body}
          onChange={setBody}
          spaceNs={space}
          height={600}
          minHeight="450px"
          autoSaveKey={space ? AUTOSAVE_KEY(space) : undefined}
          onAutoSave={handleAutoSave}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <input ref={attachFileInputRef} type="file" className="hidden" onChange={e => {
              const f = e.target.files?.[0]; if (f) { handleAttachmentUpload2(f); } e.target.value = '';
            }} />
            <button type="button" onClick={() => attachFileInputRef.current?.click()}
              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">
              <Paperclip className="h-3.5 w-3.5" />
              附件
            </button>
            <input ref={mdFileInputRef} type="file" accept=".md,.zip" className="hidden" onChange={e => {
              const f = e.target.files?.[0]; if (f) { handleImportMd(f); } e.target.value = '';
            }} />
            <button type="button" onClick={() => mdFileInputRef.current?.click()} disabled={importingMd}
              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">
              <Upload className="h-3.5 w-3.5" />
              {importingMd ? '导入中...' : '导入 MD'}
            </button>
            <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
              支持 Markdown：标题、粗体、斜体、代码、表格
            </p>
            {hasDraft && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Save className="h-3 w-3" />
                {lastSavedTime ? `已保存 ${lastSavedTime}` : '已自动保存'}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={publishing || !title.trim()}
            className="btn-primary gap-2 px-6 py-2.5"
          >
            <Send className="h-4 w-4" />
            {publishing ? '发布中...' : '发布'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewPostPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          加载中...
        </div>
      }
    >
      <NewPostForm />
    </Suspense>
  );
}
