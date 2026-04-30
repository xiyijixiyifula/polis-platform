'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Github, Plus } from 'lucide-react';
import { spaces } from '@/lib/api';

function deriveSlug(title: string): string {
  const latin = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (latin.length >= 2) return latin;

  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0;
  }
  return "community-" + Math.abs(hash).toString(36).slice(0, 6);
}

export default function CreateSpacePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('polis_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.username) setUsername(u.username);
      }
    } catch {}
  }, []);

  const autoSlug = useMemo(() => deriveSlug(title), [title]);

  useEffect(() => {
    if (!slugManual && title) {
      setSlug(autoSlug);
    }
  }, [autoSlug, slugManual]);

  const namespacePreview = username
    ? `${username}/${slug || '...'}`
    : slug || 'your-community';

  const handleCreate = async () => {
    const finalSlug = slug || deriveSlug(title);
    if (!title.trim()) { setError('请输入社区名称'); return; }
    if (finalSlug.length < 2) { setError('社区标识至少 2 个字符'); return; }

    setError('');
    setCreating(true);

    try {
      const res = await spaces.create({
        slug: finalSlug,
        title: title.trim(),
        description: description || undefined,
        visibility,
      });
      if (res.code === 0 && res.data) {
        router.push(`/space/${res.data.namespace}`);
      } else {
        setError(res.message || '创建失败');
      }
    } catch (err: any) {
      setError(err.message || '网络错误，请重试');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30 mb-4">
          <Plus className="h-7 w-7 text-primary-600 dark:text-primary-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">创建新社区</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          像创建 GitHub 仓库一样简单，填写名称即可完成
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="card space-y-5">
        {/* 社区名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            社区名称 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            className="input-field text-base"
            placeholder="如：编程技术交流 或 my-project"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        {/* 命名空间 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            命名空间
            {!slugManual && title && (
              <span className="ml-1 text-xs text-gray-400 font-normal">（根据名称自动生成）</span>
            )}
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5">
            <Github className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate">
              {namespacePreview}
            </span>
            {slugManual ? (
              <button
                type="button"
                onClick={() => { setSlugManual(false); setSlug(autoSlug); }}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline shrink-0 ml-auto"
              >
                自动
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSlugManual(true)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 ml-auto"
              >
                自定义
              </button>
            )}
          </div>
          {slugManual && (
            <div className="mt-2">
              <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3">
                {username && (
                  <span className="text-sm text-gray-400 dark:text-gray-500 shrink-0">@{username}/</span>
                )}
                <input
                  type="text"
                  className="flex-1 border-0 bg-transparent py-2 text-sm focus:outline-none dark:text-white font-mono"
                  placeholder="custom-slug"
                  value={slug}
                  onChange={e => setSlug(e.target.value.replace(/[^a-z0-9-]/g, '').toLowerCase())}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">只能包含小写字母、数字和连字符</p>
            </div>
          )}
        </div>

        {/* 简介 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            社区简介 <span className="text-gray-400 font-normal">（可选）</span>
          </label>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="简单介绍一下你的社区..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        {/* 可见性 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">可见性</label>
          <div className="flex gap-3">
            {[
              { value: 'public', label: '公开', desc: '所有人可见' },
              { value: 'private', label: '私有', desc: '仅成员可见' },
              { value: 'unlisted', label: '不公开', desc: '不显示在目录' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVisibility(opt.value)}
                className={`flex-1 rounded-lg border p-3 text-left transition-colors ${
                  visibility === opt.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 提示 */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-xs text-blue-700 dark:text-blue-400">
          💡 默认启用<strong>文章</strong>模块。创建后可在社区设置中开启更多模块（投票、公告、成员等）。
        </div>

        <button
          onClick={handleCreate}
          disabled={creating || !title.trim()}
          className="btn-primary w-full py-2.5 text-base"
        >
          {creating ? '创建中...' : '创建社区'}
        </button>
      </div>
    </div>
  );
}
