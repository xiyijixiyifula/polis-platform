'use client';

import React, { useState } from 'react';
import { ArrowLeft, Save, Eye, Globe, Lock, Link2 } from 'lucide-react';
import Link from 'next/link';

const CONTENT_TYPES = [
  { value: 'post', label: '帖子', desc: '图文内容，支持 Markdown' },
  { value: 'article', label: '文章', desc: '长文创作，支持富文本' },
];

const VISIBILITY_OPTIONS = [
  { value: 'public', label: '公开', icon: Globe, desc: '所有人可见' },
  { value: 'unlisted', label: '私密分享', icon: Link2, desc: '有链接的人可查看' },
  { value: 'private', label: '私有', icon: Lock, desc: '仅自己可见' },
];

export default function NewCreationPage() {
  const [contentType, setContentType] = useState('post');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { alert('请输入标题'); return; }
    if (!body.trim()) { alert('请输入内容'); return; }

    setSaving(true);
    try {
      const token = localStorage.getItem('polis_access_token');
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);

      const res = await fetch('/api/creations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          content_type: contentType,
          title: title.trim(),
          body: body.trim(),
          tags: tagList.length > 0 ? tagList : undefined,
          visibility,
          password: password || undefined,
        }),
      });

      const data = await res.json();
      if (data.code === 0 && data.data) {
        window.location.href = '/creations';
      } else {
        alert(data.message || '创建失败');
      }
    } catch {
      alert('网络错误，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/creations"
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition">
          <ArrowLeft size={18} /> 返回我的创作
        </Link>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPreview(!preview)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <Eye size={14} /> {preview ? '编辑' : '预览'}
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition">
            <Save size={16} /> {saving ? '保存中...' : '保存创作'}
          </button>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">新建创作</h1>

      {preview ? (
        /* 预览模式 */
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{title || '(无标题)'}</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500">{CONTENT_TYPES.find((t) => t.value === contentType)?.label}</span>
            {tags && tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded">{tag}</span>
            ))}
          </div>
          <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {body || '(无内容)'}
          </div>
        </div>
      ) : (
        /* 编辑表单 */
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 内容类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">内容类型</label>
            <div className="grid grid-cols-2 gap-3">
              {CONTENT_TYPES.map((ct) => (
                <button key={ct.value} type="button"
                  onClick={() => setContentType(ct.value)}
                  className={`p-3 text-left rounded-lg border transition-colors ${
                    contentType === ct.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{ct.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{ct.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">标题 <span className="text-red-500">*</span></label>
            <input type="text" value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="创作标题"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>

          {/* 正文 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">正文 <span className="text-red-500">*</span></label>
            <textarea value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="在这里写下你的创作内容...支持 Markdown 格式"
              rows={16}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm dark:bg-gray-800 dark:text-white font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">标签</label>
            <input type="text" value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="用逗号分隔，如：技术, Rust, Web"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>

          {/* 可见性 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">可见性</label>
            <div className="grid grid-cols-3 gap-3">
              {VISIBILITY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button key={opt.value} type="button"
                    onClick={() => setVisibility(opt.value)}
                    className={`p-3 text-center rounded-lg border transition-colors ${
                      visibility === opt.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}>
                    <Icon size={16} className="mx-auto mb-1 text-gray-500" />
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{opt.label}</div>
                    <div className="text-[10px] text-gray-400">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 分享密码（仅私密分享） */}
          {visibility === 'unlisted' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">分享密码（可选）</label>
              <input type="text" value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="设置密码后，需要输入密码才能查看"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          )}

          {/* 提交 */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <button type="submit" disabled={saving}
              className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition">
              {saving ? '正在创建...' : '创建创作'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
