'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Send, Loader2, MessageSquare, Bot, User, Settings,
  Globe, Lock, Link2, Plus, X, Tag,
} from 'lucide-react';
import { threads, getToken, type Thread, type ThreadMessage } from '@/lib/api';

const VISIBILITY_OPTIONS = [
  { value: 'public', label: '公开', icon: Globe, desc: '所有人可见' },
  { value: 'unlisted', label: '私密分享', icon: Link2, desc: '有链接的人可查看' },
  { value: 'private', label: '仅自己', icon: Lock, desc: '仅自己可见' },
];

function ThreadPublishInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadId = searchParams.get('threadId') || '';

  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [moduleType, setModuleType] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [tags, setTags] = useState('');
  const [publishing, setPublishing] = useState(false);

  const [spaceQuery, setSpaceQuery] = useState('');
  const [spaceResults, setSpaceResults] = useState<any[]>([]);
  const [spaces, setSpaces] = useState<string[]>([]);
  const [spaceTitles, setSpaceTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!threadId) {
      setError('缺少 Thread ID 参数');
      return;
    }
    loadThread();
  }, [threadId]);

  const loadThread = async () => {
    setLoading(true);
    try {
      const [tResp, msgsResp] = await Promise.all([
        threads.get(threadId),
        threads.getMessages(threadId),
      ]);
      const t = tResp.data;
      const msgs = Array.isArray(msgsResp.data) ? msgsResp.data : [];
      if (t) {
        setThread(t);
        setTitle(t.title || '');
      }
      setMessages(msgs);
    } catch {
      setError('加载 Thread 失败，请确认 ID 正确且你有权访问');
    } finally {
      setLoading(false);
    }
  };

  const handleSpaceSearch = (q: string) => {
    setSpaceQuery(q);
    if (!q.trim()) { setSpaceResults([]); return; }
    fetch(`/api/search?q=${encodeURIComponent(q.trim())}&page_size=5`)
      .then((r) => r.json())
      .then((data) => {
        if (data.code === 0 && Array.isArray(data.data)) {
          setSpaceResults(data.data);
        }
      })
      .catch(() => {});
  };

  const addSpace = (ns: string, t: string) => {
    if (spaces.includes(ns)) return;
    setSpaces((prev) => [...prev, ns]);
    setSpaceTitles((prev) => ({ ...prev, [ns]: t }));
    setSpaceQuery('');
    setSpaceResults([]);
  };

  const removeSpace = (ns: string) => {
    setSpaces((prev) => prev.filter((s) => s !== ns));
  };

  const handlePublish = async () => {
    if (!title.trim()) { setError('请输入标题'); return; }
    setPublishing(true);
    setError('');
    try {
      const result = await threads.publish(threadId, {
        title: title.trim(),
        module_type: moduleType,
        visibility,
        spaces: spaces.length > 0 ? spaces : undefined,
      });
      if (result.code === 0) {
        router.push('/creations');
      } else {
        setError(result.message || '发布失败');
      }
    } catch (e: any) {
      setError(e.message || '发布失败');
    } finally {
      setPublishing(false);
    }
  };

  if (!threadId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-gray-500">缺少 Thread ID 参数</p>
        <Link href="/creations" className="text-primary-600 hover:underline mt-2 inline-block">返回创作中心</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary-500 mb-4" />
        <p className="text-gray-500">加载对话流...</p>
      </div>
    );
  }

  if (error && !thread) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Link href="/creations" className="text-primary-600 hover:underline">返回创作中心</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/creations" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition">
          <ArrowLeft size={18} /> 返回
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">发布 AI 对话为作品</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">将对话流中的消息转换为 Markdown 作品，投稿到社区</p>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400 mb-4">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Message Preview */}
        <div className="lg:col-span-2">
          <div className="glass-card p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <MessageSquare size={16} /> 对话预览 ({messages.length} 条消息)
            </h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {messages.map((msg, i) => (
                <div key={msg.id || i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role !== 'user' && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                      {msg.role === 'assistant' ? <Bot size={16} /> : <Settings size={16} />}
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}>
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                      <User size={16} className="text-primary-600" />
                    </div>
                  )}
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-center text-gray-400 py-8">📭 暂无消息</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Config */}
        <div className="space-y-4">
          <div className="glass-card p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Settings size={16} /> 发布设置
            </h2>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">标题</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>

            {/* Module */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">模块类型（可选，默认 forum）</label>
              <input type="text" value={moduleType} onChange={(e) => setModuleType(e.target.value)} placeholder="forum"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">可见性</label>
              <div className="flex gap-1">
                {VISIBILITY_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = visibility === opt.value;
                  return (
                    <button key={opt.value} type="button" onClick={() => setVisibility(opt.value)}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs transition ${
                        active ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700' : 'border border-gray-200 dark:border-gray-700 text-gray-500'
                      }`}>
                      <Icon size={12} />{opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Spaces */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">投稿到社区（可选）</label>
              {spaces.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {spaces.map((ns) => (
                    <span key={ns} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-xs rounded-full">
                      @{spaceTitles[ns] || ns}
                      <button onClick={() => removeSpace(ns)}><X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative">
                <input type="text" value={spaceQuery} onChange={(e) => handleSpaceSearch(e.target.value)}
                  placeholder="搜索社区..."
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                {spaceResults.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg max-h-36 overflow-y-auto">
                    {spaceResults.map((s: any) => (
                      <button key={s.id} type="button" onMouseDown={() => addSpace(s.namespace, s.title || s.namespace)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-white">{s.title}</span>
                        <span className="text-xs text-gray-400">@{s.namespace}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">标签</label>
              <div className="flex items-center gap-1.5">
                <Tag size={12} className="text-gray-400" />
                <input type="text" value={tags} onChange={(e) => setTags(e.target.value)}
                  placeholder="逗号分隔" className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>

            {/* Publish button */}
            <button onClick={handlePublish} disabled={publishing || !title.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition shadow-lg shadow-primary-600/20">
              {publishing ? <><Loader2 size={16} className="animate-spin" />发布中...</> : <><Send size={16} />发布为作品</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ThreadPublishPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-20 animate-pulse space-y-4"><div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48"></div><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div><div className="h-32 bg-gray-200 dark:bg-gray-700 rounded w-full"></div></div>}>
      <ThreadPublishInner />
    </Suspense>
  );
}
