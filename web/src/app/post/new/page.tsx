'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CherryEditor } from '@/components/CherryEditor';
import { ArrowLeft, Send, LogIn } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { posts, getToken } from '@/lib/api';
import { loadModules } from '@/components/SpaceSettings';

function NewPostForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const space = searchParams.get('space') || '';

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  // 读取该社区的模块配置
  const enabledModules = useMemo(() => {
    if (!space) return null;
    return loadModules(space);
  }, [space]);

  // 可用模块列表（根据社区设置动态生成）
  const availableModules = useMemo(() => {
    const all = [
      { id: 'article', label: '📝 文章', moduleKey: 'posts' as const },
      { id: 'qa', label: '❓ 问答', moduleKey: 'qa' as const },
    ];
    if (!enabledModules) return all;
    return all.filter(m => enabledModules[m.moduleKey]);
  }, [enabledModules]);

  // 模块类型 - 根据可用模块自动选择
  const [moduleType, setModuleType] = useState('article');
  useEffect(() => {
    if (availableModules.length > 0 && !availableModules.find(m => m.id === moduleType)) {
      setModuleType(availableModules[0].id);
    }
  }, [availableModules, moduleType]);

  // 检查登录状态
  useEffect(() => {
    const token = getToken();
    setIsLoggedIn(!!token);
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
        tags: tags.split(/[，,、\s]+/).filter(Boolean),
      });
      if (res.code === 0 && res.data?.id) {
        router.push(`/post/${res.data.id}?space=${encodeURIComponent(space)}`);
      } else {
        setError(res.message || '发布失败');
      }
    } catch (err: any) {
      // 显示具体错误信息
      const msg = err?.message || '网络错误，请重试';
      if (msg.includes('Authentication') || msg.includes('401') || msg.includes('Unauthorized')) {
        setError('请先登录后再发布');
      } else {
        setError(msg);
      }
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href={space ? `/space/${space}` : '/'} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">发布新帖</h1>
            {space && <p className="text-xs text-gray-500">发布到 /{space}</p>}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        {!isLoggedIn && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 flex items-center justify-between">
            <span className="text-sm text-amber-700 dark:text-amber-400">
              ⚠️ 请先登录后再发布内容
            </span>
            <Link
              href={`/login?redirect=${encodeURIComponent(`/post/new?space=${encodeURIComponent(space)}`)}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              <LogIn className="h-4 w-4" />
              去登录
            </Link>
          </div>
        )}

        {!space && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">社区命名空间 *</label>
            <input
              type="text"
              className="input-field"
              placeholder="如: polis 或 zhangsan/rust-lab"
              onChange={(e) => {/* handled via URL query */}}
            />
            <p className="mt-1 text-xs text-gray-400">请从社区页面点击"发帖"按钮进入，或在上方 URL 中添加 ?space=命名空间</p>
          </div>
        )}

        {availableModules.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">模块:</span>
            {availableModules.map((m) => (
              <button key={m.id} type="button" onClick={() => setModuleType(m.id)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  moduleType === m.id ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                {m.label}
              </button>
            ))}
          </div>
        )}
        {availableModules.length <= 1 && (
          <p className="text-xs text-gray-400">📝 发布为文章</p>
        )}

        <input
          type="text"
          placeholder="输入帖子标题..."
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-lg font-medium text-gray-900 placeholder-gray-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
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

        <CherryEditor value={body} onChange={setBody} />

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            💡 支持 Markdown 语法：**粗体** *斜体* `代码` [链接](url)
          </p>
          <button type="submit" disabled={publishing || !title.trim()} className="btn-primary gap-2 px-6 py-2.5">
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
    <Suspense fallback={<div className="p-8 text-center text-gray-500">加载中...</div>}>
      <NewPostForm />
    </Suspense>
  );
}
