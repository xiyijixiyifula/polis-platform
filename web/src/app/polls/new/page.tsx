'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

export default function NewPollPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [pollType, setPollType] = useState('single');

  const addOption = () => setOptions([...options, '']);
  const removeOption = (i: number) => { if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i)); };
  const updateOption = (i: number, v: string) => { const o = [...options]; o[i] = v; setOptions(o); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('polis_access_token');
    const validOpts = options.filter(Boolean);
    if (validOpts.length < 2) return;
    const res = await fetch('/api/polls', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, description: desc, poll_type: pollType, options: validOpts }),
    });
    const data = await res.json();
    if (data.code === 0) router.back();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">创建投票</h1>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">投票标题</label>
          <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">说明（可选）</label>
          <textarea className="input-field resize-none" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">投票类型</label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setPollType('single')}
              className={`px-4 py-2 rounded-lg text-sm border ${pollType === 'single' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200'}`}>单选</button>
            <button type="button" onClick={() => setPollType('multiple')}
              className={`px-4 py-2 rounded-lg text-sm border ${pollType === 'multiple' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200'}`}>多选</button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">选项</label>
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
        <button type="submit" className="btn-primary w-full py-2.5" disabled={options.filter(Boolean).length < 2}>
          创建投票
        </button>
      </form>
    </div>
  );
}
