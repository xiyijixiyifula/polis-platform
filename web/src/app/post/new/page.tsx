'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MilkdownEditor } from '@/components/MilkdownEditor';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { posts } from '@/lib/api';

function NewPostForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const space = searchParams.get('space') || '';

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [moduleType, setModuleType] = useState('forum');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

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
        router.push(`/post/${res.data.id}`);
      } else {
        setError(res.message || '发布失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
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
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
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

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">模块:</span>
          {[
            { id: 'forum', label: '💬 讨论' },
            { id: 'article', label: '📝 文章' },
            { id: 'qa', label: '❓ 问答' },
            { id: 'code_repo', label: '📦 代码' },
          ].map((m) => (
            <button key={m.id} type="button" onClick={() => setModuleType(m.id)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                moduleType === m.id ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}>
              {m.label}
            </button>
          ))}
        </div>

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

        <MilkdownEditor value={body} onChange={setBody} />

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
