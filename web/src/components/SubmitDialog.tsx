'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import { getModuleLabel } from '@/lib/module-config';

interface Space {
  id: string;
  namespace: string;
  title: string;
  enabled_modules: string[] | string; // API 可能返回 JSON 字符串
}

/** 安全地将 enabled_modules 转为数组 */
function safeModules(raw: string[] | string | any): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
}

interface SubmitDialogProps {
  creationId: string;
  onClose: () => void;
  onSubmit: (spaceNs: string, moduleType: string) => void;
}

export default function SubmitDialog({ creationId, onClose, onSubmit }: SubmitDialogProps) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [filtered, setFiltered] = useState<Space[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => { fetchSpaces(); }, []);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) { setFiltered(spaces); return; }
    setFiltered(spaces.filter((s) =>
      s.title.toLowerCase().includes(q) || s.namespace.toLowerCase().includes(q)
    ));
  }, [search, spaces]);

  const fetchSpaces = async () => {
    try {
      setFetching(true);
      const token = localStorage.getItem('polis_access_token');
      const res = await fetch('/api/spaces?mine=true&page_size=100', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      // 防御性处理：API 可能返回纯数组或分页对象 { items: [...] }
      if (data.data) {
        const spaces = Array.isArray(data.data) ? data.data
          : (Array.isArray(data.data.items) ? data.data.items : []);
        setSpaces(spaces);
        setFiltered(spaces);
      }
    } catch { /* 静默失败 */ } finally { setFetching(false); }
  };

  const handleSubmit = async () => {
    if (!selectedSpace || !selectedModule) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('polis_access_token');
      const res = await fetch(`/api/creations/${creationId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          space_ns: selectedSpace.namespace,
          module_type: selectedModule,
        }),
      });
      const data = await res.json();
      if (data.code === 0) {
        onSubmit(selectedSpace.namespace, selectedModule);
        onClose();
      } else if (res.status === 409) {
        alert('该内容已经投稿到这个社区的此模块了');
      } else {
        alert(data.message || '投稿失败');
      }
    } catch { alert('网络错误'); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="glass-modal rounded-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">投稿到社区</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* 搜索 */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索社区..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
        </div>

        {/* 社区列表 */}
        <div className="flex-1 overflow-y-auto px-4">
          {fetching ? (
            <div className="text-center py-8 text-gray-400 text-sm">加载中...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {search ? '没有找到匹配的社区' : '暂无社区'}
            </div>
          ) : (
            <div className="space-y-1 py-2">
              {filtered.map((space) => (
                <button key={space.id}
                  onClick={() => { setSelectedSpace(space); setSelectedModule(''); }}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-lg transition ${
                    selectedSpace?.id === space.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'
                  }`}>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold shrink-0">
                    {space.title[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{space.title}</div>
                    <div className="text-xs text-gray-400 truncate">@{space.namespace}</div>
                  </div>
                  {selectedSpace?.id === space.id && <Check size={18} className="text-primary-600 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 模块选择 */}
        {selectedSpace && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 mb-2">选择模块：</div>
            <div className="flex flex-wrap gap-2">
              {safeModules(selectedSpace.enabled_modules).map((mod) => (
                <button key={mod} onClick={() => setSelectedModule(mod)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition ${
                    selectedModule === mod
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400'
                  }`}>
                  {getModuleLabel(mod)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
            取消
          </button>
          <button onClick={handleSubmit}
            disabled={!selectedSpace || !selectedModule || loading}
            className={`px-4 py-2 text-sm text-white rounded-lg transition ${
              selectedSpace && selectedModule && !loading
                ? 'bg-primary-600 hover:bg-primary-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}>
            {loading ? '投稿中...' : '确认投稿'}
          </button>
        </div>
      </div>
    </div>
  );
}
