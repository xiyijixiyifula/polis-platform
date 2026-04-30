'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Github } from 'lucide-react';
import { spaces } from '@/lib/api';

// Auto-derive slug from title: lowercase, replace spaces/special chars, keep alphanumeric + hyphens
function deriveSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\s-]/g, '')
    .replace(/[\u4e00-\u9fff]+/g, '')  // strip Chinese chars (no direct pinyin, just remove)
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'community';
}

export default function CreateSpacePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    visibility: 'public' as string,
  });
  const [slugManual, setSlugManual] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set(['forum']));

  useEffect(() => {
    // Try to get current username for preview
    try {
      const raw = localStorage.getItem('polis_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.username) setUsername(u.username);
      }
    } catch {}
  }, []);

  // Auto-derive slug from title (unless manually editing)
  const autoSlug = useMemo(() => deriveSlug(form.title), [form.title]);

  useEffect(() => {
    if (!slugManual && form.title) {
      setForm(f => ({ ...f, slug: autoSlug }));
    }
  }, [autoSlug, slugManual]);

  const namespacePreview = username ? `@${username}/${form.slug || '...'}` : form.slug || 'community';

  const templates = [
    { id: 'blank', label: '空白', desc: '自定义', icon: '📄', modules: ['forum'] },
    { id: 'tech', label: '技术', desc: '编程/科技', icon: '💻', modules: ['forum', 'article', 'code_repo', 'qa'] },
    { id: 'gaming', label: '游戏', desc: '玩家聚集地', icon: '🎮', modules: ['forum', 'chat'] },
    { id: 'design', label: '设计', desc: '设计师交流', icon: '🎨', modules: ['forum', 'article'] },
    { id: 'education', label: '教育', desc: '课程/学习', icon: '📚', modules: ['forum', 'article', 'course'] },
    { id: 'business', label: '商业', desc: '电商/变现', icon: '💼', modules: ['forum', 'store'] },
  ];

  const modules = [
    { id: 'forum', label: '论坛', desc: '帖子、评论、点赞', icon: '💬', recommended: true },
    { id: 'article', label: '文章', desc: '长文、博客', icon: '📝' },
    { id: 'qa', label: '问答', desc: '付费提问', icon: '❓' },
    { id: 'code_repo', label: '代码仓库', desc: 'Git 仓库托管', icon: '📦' },
    { id: 'chat', label: '聊天', desc: '即时通讯', icon: '💭' },
    { id: 'store', label: '商城', desc: '商品交易', icon: '🛍️' },
    { id: 'course', label: '课程', desc: '在线课程', icon: '🎓' },
    { id: 'game', label: '游戏', desc: 'WASM 小游戏', icon: '🎮' },
  ];

  const applyTemplate = (templateId: string) => {
    const tmpl = templates.find(t => t.id === templateId);
    if (!tmpl) return;
    setSelectedTemplate(templateId);
    if (templateId !== 'blank') {
      const titles: Record<string, string> = {
        tech: '技术交流', gaming: '游戏玩家俱乐部', design: '设计工作室',
        education: '在线课堂', business: '创业者之家',
      };
      const descs: Record<string, string> = {
        tech: '欢迎来到技术社区！讨论编程、架构、AI 等技术话题。',
        gaming: '欢迎游戏玩家！分享游戏心得和高光时刻。',
        design: '设计师的交流平台，分享作品、交流经验。',
        education: '在线学习社区，提供高质量课程和学习资源。',
        business: '创业者和商人的交流平台，分享商业洞察。',
      };
      if (titles[templateId]) setForm(f => ({ ...f, title: titles[templateId] }));
      if (descs[templateId]) setForm(f => ({ ...f, description: descs[templateId] }));
    }
  };

  const handleCreate = async () => {
    const slug = form.slug || deriveSlug(form.title);
    if (!form.title) { setError('请输入社区名称'); return; }
    if (slug.length < 2) { setError('社区标识至少 2 个字符'); return; }

    setError('');
    setCreating(true);

    try {
      const res = await spaces.create({ slug, title: form.title, description: form.description || undefined, visibility: form.visibility });
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
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Steps */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= s ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
            }`}>{s}</div>
            <span className={`text-sm ${step >= s ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
              {['基本信息', '选择模块', '确认创建'][s - 1]}
            </span>
            {s < 3 && <div className={`h-px w-12 ${step > s ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`} />}
          </div>
        ))}
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}

      {/* Step 1: Info */}
      {step === 1 && (
        <div className="card space-y-5">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">创建社区</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">选择一个模板快速开始，或从空白创建。</p>

          {/* Templates */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">快速模板</label>
            <div className="flex flex-wrap gap-2">
              {templates.map(t => (
                <button key={t.id} onClick={() => applyTemplate(t.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-center transition-colors ${
                    selectedTemplate === t.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-500'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}>
                  <span className="text-sm">{t.icon}</span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Community Name (唯一输入，替代标题+标识) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">社区名称 *</label>
            <input type="text" className="input-field" placeholder="如：编程技术交流 或 my-awesome-project"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>

          {/* Namespace Preview (GitHub style) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              命名空间预览
              {!slugManual && form.title && (
                <span className="ml-1 text-xs text-gray-400 font-normal">（自动生成）</span>
              )}
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5">
              <Github className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate">
                {namespacePreview}
              </span>
              {slugManual ? (
                <button onClick={() => { setSlugManual(false); setForm(f => ({ ...f, slug: autoSlug })); }}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline shrink-0 ml-2">
                  自动
                </button>
              ) : (
                <button onClick={() => setSlugManual(true)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 ml-2">
                  自定义
                </button>
              )}
            </div>
            {slugManual && (
              <div className="mt-2">
                <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3">
                  {username && (
                    <span className="text-sm text-gray-400 dark:text-gray-500">@{username}/</span>
                  )}
                  <input type="text" className="flex-1 border-0 bg-transparent py-2 text-sm focus:outline-none dark:text-white"
                    placeholder="custom-slug"
                    value={form.slug}
                    onChange={e => setForm({ ...form, slug: e.target.value.replace(/[^a-z0-9-]/g, '').toLowerCase() })} />
                </div>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">只能包含小写字母、数字和连字符</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">社区简介</label>
            <textarea className="input-field resize-none" rows={3} placeholder="介绍一下你的社区..."
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">可见性</label>
            <div className="flex gap-3">
              {[
                { value: 'public', label: '公开', desc: '所有人可见' },
                { value: 'private', label: '私有', desc: '仅成员可见' },
                { value: 'unlisted', label: '不公开', desc: '不显示在目录' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setForm({ ...form, visibility: opt.value })}
                  className={`flex-1 rounded-lg border p-3 text-left transition-colors ${
                    form.visibility === opt.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => setStep(2)} className="btn-primary px-8 py-2.5">下一步</button>
          </div>
        </div>
      )}

      {/* Step 2: Modules */}
      {step === 2 && (
        <div className="card space-y-5">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">选择功能模块</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">选择需要启用的模块，之后可在社区设置中随时开关。</p>

          <div className="grid grid-cols-2 gap-3">
            {modules.map(m => (
              <button key={m.id} onClick={() => {
                setSelectedTemplate(null);
                setEnabledModules(prev => {
                  const n = new Set(prev);
                  n.has(m.id) ? n.delete(m.id) : n.add(m.id);
                  return n;
                });
              }}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  enabledModules.has(m.id)
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-500'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{m.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                      {m.label}
                      {m.recommended && (
                        <span className="text-[10px] text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30 px-1 rounded">推荐</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{m.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="btn-secondary px-6 py-2.5">上一步</button>
            <button onClick={() => setStep(3)} className="btn-primary px-8 py-2.5">下一步</button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="card space-y-5">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">确认创建</h2>

          <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">命名空间</span>
              <span className="font-medium font-mono text-gray-900 dark:text-white">{namespacePreview}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">名称</span>
              <span className="font-medium text-gray-900 dark:text-white">{form.title}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">可见性</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {{public:'公开', private:'私有', unlisted:'不公开'}[form.visibility]}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">模块</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {modules.filter(m => enabledModules.has(m.id)).map(m => m.label).join(' · ') || '论坛'}
              </span>
            </div>
          </div>

          {form.description && (
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">简介</label>
              <p className="text-sm text-gray-900 dark:text-white mt-1">{form.description}</p>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="btn-secondary px-6 py-2.5">上一步</button>
            <button onClick={handleCreate} disabled={creating} className="btn-primary px-8 py-2.5">
              {creating ? '创建中...' : '创建社区'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
