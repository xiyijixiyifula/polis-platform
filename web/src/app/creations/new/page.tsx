'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, Eye, Globe, Lock, Link2, PenLine, FileText, MessageSquareText,
  Home, Plus, X, Image, Video, File, Upload, Download, Tag
} from 'lucide-react';

const CONTENT_TYPES = [
  { value: 'post', label: '图文', desc: 'Markdown 图文内容', icon: FileText },
  { value: 'article', label: '文章', desc: '长文创作', icon: PenLine },
  { value: 'video', label: '视频', desc: '视频内容', icon: Video },
];

const MODULE_TYPES = [
  { value: 'forum', label: '交流', icon: MessageSquareText },
  { value: 'article', label: '文章', icon: FileText },
  { value: 'share', label: '分享', icon: Link2 },
  { value: 'wiki', label: '知识库', icon: File },
  { value: 'qa', label: '问答', icon: MessageSquareText },
  { value: 'video', label: '视频', icon: Video },
  { value: 'novel', label: '小说', icon: FileText },
  { value: 'game', label: '游戏', icon: Globe },
  { value: 'mini_app', label: '小程序', icon: File },
];

const VISIBILITY_OPTIONS = [
  { value: 'public', label: '公开', icon: Globe, desc: '所有人可见' },
  { value: 'unlisted', label: '私密分享', icon: Link2, desc: '有链接的人可查看' },
  { value: 'private', label: '仅自己', icon: Lock, desc: '仅自己可见' },
];

type SidebarSection = 'publish' | 'content' | 'interactions';

interface SubmissionEntry {
  spaceId: string;
  spaceNs: string;
  spaceTitle: string;
  moduleType: string;
}

function NewCreationPageInner() {
  const searchParams = useSearchParams();
  const prefillSpaceNs = searchParams.get('space') || '';
  const prefillModule = searchParams.get('module') || '';

  const [contentType, setContentType] = useState('post');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [allowDownload, setAllowDownload] = useState(true);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [saveAsDraft, setSaveAsDraft] = useState(false);

  const [submissions, setSubmissions] = useState<SubmissionEntry[]>([]);

  const [spaceQuery, setSpaceQuery] = useState('');
  const [spaceResults, setSpaceResults] = useState<any[]>([]);
  const [spaceLoading, setSpaceLoading] = useState(false);
  const [showSpaceDropdown, setShowSpaceDropdown] = useState(false);
  const [selectedModule, setSelectedModule] = useState(prefillModule || 'forum');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (prefillSpaceNs && prefillModule) {
      setSelectedModule(prefillModule);
      setContentType(prefillModule === 'video' ? 'video' : 'post');
      (async () => {
        try {
          const res = await fetch(`/api/spaces/${encodeURIComponent(prefillSpaceNs.replace(/\//g, '~'))}`);
          const data = await res.json();
          if (data.code === 0 && data.data) {
            const s = data.data;
            setSubmissions([{
              spaceId: s.id,
              spaceNs: s.namespace,
              spaceTitle: s.title,
              moduleType: prefillModule,
            }]);
          }
        } catch {}
      })();
    }
  }, [prefillSpaceNs, prefillModule]);

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
            return mods.includes(selectedModule);
          });
          setSpaceResults(filtered);
          setShowSpaceDropdown(true);
        }
      } catch {}
      setSpaceLoading(false);
    }, 300);
  };

  const addSubmission = (space: any) => {
    if (submissions.some(s => s.spaceId === space.id && s.moduleType === selectedModule)) return;
    setSubmissions(prev => [...prev, {
      spaceId: space.id,
      spaceNs: space.namespace,
      spaceTitle: space.title,
      moduleType: selectedModule,
    }]);
    setSpaceQuery('');
    setSpaceResults([]);
    setShowSpaceDropdown(false);
  };

  const removeSubmission = (spaceId: string, moduleType: string) => {
    setSubmissions(prev => prev.filter(s => !(s.spaceId === spaceId && s.moduleType === moduleType)));
  };

  const [uploadedMedia, setUploadedMedia] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const token = localStorage.getItem('polis_access_token');
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/files/upload', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        const data = await res.json();
        if (data.code === 0 && data.data?.url) {
          setUploadedMedia(prev => [...prev, data.data.url]);
          if (!coverUrl && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
            setCoverUrl(data.data.url);
          }
        }
      } catch {}
    }
    setUploading(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
          visibility: saveAsDraft ? 'private' : visibility,
          password: password || undefined,
          cover_url: coverUrl || undefined,
          media_urls: uploadedMedia.length > 0 ? uploadedMedia : undefined,
          metadata: { allow_download: allowDownload, is_draft: saveAsDraft },
        }),
      });

      const data = await res.json();
      if (data.code === 0 && data.data) {
        const creationId = data.data.id;
        if (submissions.length > 0) {
          await Promise.all(submissions.map(sub =>
            fetch(`/api/creations/${creationId}/submit`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ space_id: sub.spaceId, module_type: sub.moduleType }),
            }).catch(() => {})
          ));
        }
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

  const handleSaveDraft = async () => {
    setSaveAsDraft(true);
    await handleSubmit();
  };

  const handlePublish = async () => {
    setSaveAsDraft(false);
    await handleSubmit();
  };

  const sidebarItems: { key: SidebarSection; label: string; icon: React.ReactNode; href?: string }[] = [
    { key: 'publish', label: '发布作品', icon: <PenLine size={18} /> },
    { key: 'content', label: '内容管理', icon: <FileText size={18} />, href: '/creations' },
    { key: 'interactions', label: '互动管理', icon: <MessageSquareText size={18} />, href: '/creations' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 flex gap-6">
      <div className="w-56 shrink-0 hidden md:block">
        <div className="glass-card p-4 sticky top-20">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4 px-2 flex items-center gap-2">
            <Home size={16} className="text-primary-500" />
            创作者中心
          </h2>
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const isActive = item.key === 'publish';
              const className = `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'
              }`;
              if (item.href && !isActive) {
                return (
                  <Link key={item.key} href={item.href} className={className}>
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              }
              return (
                <div key={item.key} className={className}>
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <Link href="/creations"
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition">
            <ArrowLeft size={18} /> 返回内容管理
          </Link>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPreview(!preview)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <Eye size={14} /> {preview ? '编辑' : '预览'}
            </button>
            <button type="button" onClick={handleSaveDraft}
              className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <Save size={14} /> 暂存草稿
            </button>
            <button type="button" onClick={handlePublish} disabled={saving}
              className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition">
              <Upload size={14} /> {saving ? '发布中...' : '发布作品'}
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {prefillSpaceNs ? `在 @${prefillSpaceNs.split('/')[1] || prefillSpaceNs} 发布` : '发布新作品'}
        </h1>

        {preview ? (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title || '(无标题)'}</h2>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500">
                  {CONTENT_TYPES.find((t) => t.value === contentType)?.label}
                </span>
                {tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag: string) => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded">{tag}</span>
                ))}
              </div>
              <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {body || '(无内容)'}
              </div>
              {uploadedMedia.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {uploadedMedia.map((url, i) => (
                    <img key={i} src={url} alt="" className="rounded-lg object-cover w-full h-40" />
                  ))}
                </div>
              )}
            </div>
            {submissions.length > 0 && (
              <div className="glass-card rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">投递社区</h3>
                <div className="space-y-1">
                  {submissions.map((s, i) => (
                    <div key={i} className="text-xs text-gray-500">
                      {'→'} @{s.spaceNs}/{MODULE_TYPES.find(m => m.value === s.moduleType)?.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">作品类型</label>
              <div className="flex gap-2 flex-wrap">
                {CONTENT_TYPES.map((ct) => {
                  const Icon = ct.icon;
                  return (
                    <button key={ct.value} type="button"
                      onClick={() => setContentType(ct.value)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                        contentType === ct.value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}>
                      <Icon size={16} />
                      <span className="font-medium">{ct.label}</span>
                      <span className="text-xs text-gray-400 hidden sm:inline">{ct.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                投递到社区 <span className="text-xs text-gray-400 font-normal">(可选，可多选)</span>
              </label>
              {submissions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {submissions.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-xs rounded-full">
                      @{s.spaceTitle || s.spaceNs} / {MODULE_TYPES.find(m => m.value === s.moduleType)?.label}
                      <button onClick={() => removeSubmission(s.spaceId, s.moduleType)} className="hover:text-red-500">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <select value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500">
                  {MODULE_TYPES.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <input type="text" value={spaceQuery}
                    onChange={(e) => handleSpaceSearch(e.target.value)}
                    onFocus={() => { if (spaceResults.length > 0) setShowSpaceDropdown(true); }}
                    onBlur={() => setTimeout(() => setShowSpaceDropdown(false), 200)}
                    placeholder="搜索社区名称..."
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary-500" />
                  {spaceLoading && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">搜索中...</span>
                  )}
                  {showSpaceDropdown && spaceResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg max-h-48 overflow-y-auto">
                      {spaceResults.map((s: any) => (
                        <button key={s.id} type="button"
                          onMouseDown={() => addSubmission(s)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between">
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">{s.title || s.namespace}</span>
                            <span className="text-xs text-gray-400 ml-2">@{s.namespace}</span>
                          </div>
                          <Plus size={14} className="text-primary-500" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">标题 <span className="text-red-500">*</span></label>
              <input type="text" value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="给你的作品起个名字..."
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">正文 <span className="text-red-500">*</span></label>
              <textarea value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="在这里写下你的创作内容... 支持 Markdown 格式"
                rows={14}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm dark:bg-gray-800 dark:text-white font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                媒体附件 <span className="text-xs text-gray-400 font-normal">(图片、视频等)</span>
              </label>
              <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
              {uploadedMedia.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {uploadedMedia.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt="" className="w-24 h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                      <button onClick={() => setUploadedMedia(prev => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 hover:border-primary-400 hover:text-primary-600 transition">
                <Upload size={14} /> {uploading ? '上传中...' : '上传文件'}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">封面链接 <span className="text-xs text-gray-400 font-normal">(可选)</span></label>
              <input type="text" value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">标签</label>
              <div className="flex items-center gap-2">
                <Tag size={14} className="text-gray-400 shrink-0" />
                <input type="text" value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="用逗号分隔，如：技术, Rust, Web"
                  className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">发布设置</label>
              <div className="mb-4">
                <div className="grid grid-cols-3 gap-2">
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
              {visibility === 'unlisted' && (
                <div className="mb-4">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">分享密码 (可选)</label>
                  <input type="text" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="设置密码后，需要输入密码才能查看"
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 text-sm dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary-500" />
                </div>
              )}
              <label className="flex items-center gap-3 cursor-pointer">
                <button type="button" role="switch" aria-checked={allowDownload}
                  onClick={() => setAllowDownload(!allowDownload)}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                    allowDownload ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transform transition-transform ${
                    allowDownload ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <Download size={14} className="inline mr-1" />
                  允许他人下载内容
                </span>
              </label>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <button type="button" onClick={handleSaveDraft}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50">
                <Save size={16} /> 暂存草稿
              </button>
              <button type="button" onClick={handlePublish}
                disabled={saving}
                className="flex-1 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition">
                {saving ? '发布中...' : (prefillSpaceNs ? '发布到社区' : '发布作品')}
              </button>
            </div>
          </div>
        )}
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
