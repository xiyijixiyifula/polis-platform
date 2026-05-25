'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { CherryEditor } from '@/components/CherryEditor';
import {
  ArrowLeft, Globe, Lock, Link2, Trash2, Save, Tag, Send,
  Maximize2, Minimize2, Paperclip, Upload,
} from 'lucide-react';
import Link from 'next/link';
import { getToken } from '@/lib/api';

const VISIBILITY_OPTIONS = [
  { value: 'public', label: '公开', icon: Globe, desc: '所有人可见' },
  { value: 'unlisted', label: '私密分享', icon: Link2, desc: '有链接的人可查看' },
  { value: 'private', label: '仅自己', icon: Lock, desc: '仅自己可见' },
];

function EditCreationPageInner() {
  const params = useParams();
  const id = params.id as string;

  // 重定向到统一编辑器（/creations/new?edit=id）
  useEffect(() => {
    if (id) {
      window.location.replace(`/creations/new?edit=${id}`);
    }
  }, [id]);

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const attachFileInputRef = useRef<HTMLInputElement>(null);
  const mdFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    const token = getToken() || '';
    fetch(`/api/creations/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json())
      .then((data) => {
        if (data.data) {
          setTitle(data.data.title || '');
          setBody(data.data.body || '');
          setTags(Array.isArray(data.data.tags) ? data.data.tags.join(', ') : (data.data.tags || ''));
          setVisibility(data.data.visibility || 'public');
          setPassword(data.data.password_hash ? '' : '');
        }
      })
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) { setError('请输入标题'); return; }
    setSaving(true); setError('');
    try {
      const token = getToken() || '';
      const tagList = tags.split(/[,，、\s]+/).filter(Boolean);
      const pwd = password || undefined;
      const res = await fetch(`/api/creations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ title: title.trim(), body, tags: tagList.length > 0 ? tagList : undefined, visibility, password: pwd }),
      });
      const data = await res.json();
      if (data.code === 0) {
        window.location.href = '/creations';
      } else {
        setError(data.message || '保存失败');
      }
    } catch { setError('网络错误，请重试'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这个创作吗？所有引用也会被移除。')) return;
    try {
      const token = getToken() || '';
      const res = await fetch(`/api/creations/${id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json();
      if (data.code === 0) window.location.href = '/creations';
      else alert(data.message || '删除失败');
    } catch { alert('网络错误'); }
  };

  const handleAttachmentUpload = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) { alert('文件大小不能超过 8MB'); return; }
    try {
      const token = getToken() || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string)?.split(',')[1];
        if (!base64) return;
        const res = await fetch('/api/upload', { method: 'POST', headers, body: JSON.stringify({ filename: file.name, data_base64: base64, mime_type: file.type || 'application/octet-stream' }) });
        const data = await res.json();
        if (data.code === 0 && data.data?.id) {
          const url = data.data.url || '/api/files/' + data.data.id;
          setBody(prev => prev + '\n[' + file.name + '](' + url + ')');
        }
      };
      reader.readAsDataURL(file);
    } catch {}
  };

  const handleImportMd = async (file: File) => {
    try {
      if (file.name.endsWith('.zip') || file.name.endsWith('.ZIP')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = (e.target?.result as string)?.split(',')[1];
          if (!base64) return;
          const token = getToken() || '';
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = 'Bearer ' + token;
          const res = await fetch('/api/import/markdown', { method: 'POST', headers, body: JSON.stringify({ filename: file.name, data_base64: base64, mime_type: file.type || 'application/octet-stream' }) });
          const data = await res.json();
          if (data.code === 0 && data.data?.content) setBody(prev => prev ? prev + '\n\n' + data.data.content : data.data.content);
          else alert('导入失败：' + (data.message || '未知错误'));
        };
        reader.readAsDataURL(file);
      } else {
        const text = await file.text();
        setBody(prev => prev ? prev + '\n\n' + text : text);
      }
    } catch {}
  };

  // ── ESC handler ──
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (isFullscreen) {
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
            <button type="button" onClick={() => setIsFullscreen(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">退出全屏</button>
            <button onClick={handleSubmit} disabled={saving || !title.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50">
              <Save className="h-4 w-4" />{saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <CherryEditor value={body} onChange={setBody} height="100%" minHeight="100%" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <Link href="/creations" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition">
          <ArrowLeft size={18} /> 返回内容管理
        </Link>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleDelete}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition">
            <Trash2 size={14} /> 删除
          </button>
          <button type="button" onClick={() => setIsFullscreen(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <Maximize2 size={14} /> 全屏
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition">
            <Save size={16} /> {saving ? '保存中...' : '保存修改'}
          </button>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">编辑创作</h1>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2 mb-4">
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-gray-500 dark:text-gray-400">可见性:</span>
          <select value={visibility}
            onChange={(e) => { setVisibility(e.target.value); if (e.target.value !== 'unlisted') setPassword(''); }}
            className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-transparent">
            {VISIBILITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label} — {opt.desc}</option>)}
          </select>
          {visibility === 'unlisted' && (
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="新密码（留空不变）"
              className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-transparent w-44" />
          )}
          <div className="flex items-center gap-1.5 ml-2">
            <Tag size={13} className="text-gray-400" />
            <input type="text" value={tags} onChange={(e) => setTags(e.target.value)}
              placeholder="标签 (逗号分隔)" className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-transparent w-44" />
          </div>
        </div>

        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="创作标题" required
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-lg font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900 transition-all" />

        <CherryEditor value={body} onChange={setBody} height={600} minHeight="400px" />

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
            <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">支持 Markdown、图片拖拽、代码高亮</p>
          </div>
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition shadow-lg shadow-primary-600/20">
            <Save size={16} />{saving ? '保存中...' : '保存修改'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditCreationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">加载中...</div>}>
      <EditCreationPageInner />
    </Suspense>
  );
}
