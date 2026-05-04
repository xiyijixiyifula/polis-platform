'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, X, BarChart3, Globe, ChevronDown } from 'lucide-react';
import { Suspense } from 'react';

interface SpaceOption {
  id: string;
  namespace: string;
  title: string;
}

function NewPollForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const spaceParam = searchParams.get('space') || '';
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [pollType, setPollType] = useState('single');
  const [spaces, setSpaces] = useState<SpaceOption[]>([]);
  const [selectedSpace, setSelectedSpace] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch user's spaces
  useEffect(() => {
    const token = localStorage.getItem('polis_access_token');
    if (!token) return;
    setLoading(true);
    // Get user info first
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.code === 0 && data.data?.username) {
          const username = data.data.username;
          // Fetch spaces where user is a member via trending (includes joined spaces)
          fetch('/api/spaces/trending')
            .then(r => r.json())
            .then(sd => {
              if (sd.code === 0 && Array.isArray(sd.data)) {
                const userSpaces = sd.data.filter((s: any) =>
                  s.namespace?.startsWith(username + '/') || s.owner_id === data.data.id
                );
                setSpaces(userSpaces.map((s: any) => ({
                  id: s.id, namespace: s.namespace, title: s.title
                })));
                // Auto-select if space param provided or if only one space
                if (spaceParam) {
                  const match = userSpaces.find((s: any) => s.namespace === spaceParam);
                  if (match) setSelectedSpace(match.id);
                } else if (userSpaces.length === 1) {
                  setSelectedSpace(userSpaces[0].id);
                }
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [spaceParam]);

  const addOption = () => setOptions([...options, '']);
  const removeOption = (i: number) => { if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i)); };
  const updateOption = (i: number, v: string) => { const o = [...options]; o[i] = v; setOptions(o); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedSpace) { setError('请选择社区'); return; }
    const token = localStorage.getItem('polis_access_token');
    const validOpts = options.filter(Boolean);
    if (validOpts.length < 2) { setError('至少需要 2 个选项'); return; }
    try {
      const res = await fetch('/api/polls', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          space_id: selectedSpace,
          title,
          description: desc || undefined,
          poll_type: pollType,
          options: validOpts,
        }),
      });
      const data = await res.json();
      if (data.code === 0) {
        router.back();
      } else {
        setError(data.message || '创建失败');
      }
    } catch {
      setError('网络错误');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-primary-600" />
        创建投票
      </h1>
      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        {/* Community selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">目标社区</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={selectedSpace}
              onChange={(e) => setSelectedSpace(e.target.value)}
              className="input-field pl-10 appearance-none cursor-pointer"
              required
            >
              <option value="">选择社区...</option>
              {spaces.map(s => (
                <option key={s.id} value={s.id}>{s.title} ({s.namespace})</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          {spaces.length === 0 && !loading && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              未找到你的社区。请先创建或加入一个社区。
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">投票标题</label>
          <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="输入投票问题" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">说明（可选）</label>
          <textarea className="input-field resize-none" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="投票补充说明..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">投票类型</label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setPollType('single')}
              className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                pollType === 'single'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
              }`}>单选</button>
            <button type="button" onClick={() => setPollType('multiple')}
              className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                pollType === 'multiple'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
              }`}>多选</button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">选项</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className="input-field flex-1" placeholder={`选项 ${i + 1}`}
                  value={opt} onChange={(e) => updateOption(i, e.target.value)} required={i < 2} />
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500 p-1">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addOption} className="mt-2 btn-secondary text-xs px-3 py-1.5 gap-1">
            <Plus className="h-3 w-3" /> 添加选项
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button type="submit" className="btn-primary w-full py-2.5" disabled={options.filter(Boolean).length < 2}>
          创建投票
        </button>
      </form>
    </div>
  );
}

export default function NewPollPage() {
  return <Suspense><NewPollForm /></Suspense>;
}
