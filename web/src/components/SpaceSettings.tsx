'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Edit3, Trash2, FileText, Video, Globe, Users } from 'lucide-react';
import { spaces, type SpaceModule } from '@/lib/api';

interface Props {
  namespace: string;
  onClose?: () => void;
}

export default function SpaceModulesManager({ namespace, onClose }: Props) {
  const [modules, setModules] = useState<SpaceModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMode, setNewMode] = useState('free');
  const [newTypes, setNewTypes] = useState<string[]>(['article']);

  // Edit form
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editMode, setEditMode] = useState('free');
  const [editTypes, setEditTypes] = useState<string[]>(['article']);

  const fetchModules = async () => {
    try {
      const res = await spaces.listModules(namespace);
      if (res.code === 0 && res.data) setModules(res.data);
    } catch (e) { console.error('Failed to fetch modules:', e); }
    setLoading(false);
  };

  useEffect(() => { fetchModules(); }, [namespace]);

  const handleAdd = async () => {
    if (!newName.trim() || newTypes.length === 0) return;
    setSaving(true);
    try {
      const res = await spaces.createModule(namespace, {
        name: newName.trim(),
        mode: newMode,
        allowed_content_types: newTypes,
      });
      if (res.code === 0 && res.data) {
        setModules(prev => [...prev, res.data!]);
        setShowAdd(false);
        setNewName('');
        setNewMode('free');
        setNewTypes(['article']);
      }
    } catch (e) { console.error('Failed to create module:', e); }
    setSaving(false);
  };

  const handleUpdate = async (moduleKey: string) => {
    if (!editName.trim() || editTypes.length === 0) return;
    setSaving(true);
    try {
      const res = await spaces.updateModule(namespace, moduleKey, {
        name: editName.trim(),
        mode: editMode,
        allowed_content_types: editTypes,
      });
      if (res.code === 0 && res.data) {
        setModules(prev => prev.map(m => m.module_key === moduleKey ? res.data! : m));
        setEditingKey(null);
      }
    } catch (e) { console.error('Failed to update module:', e); }
    setSaving(false);
  };

  const handleDelete = async (moduleKey: string) => {
    if (!confirm('确定删除此模块？该模块下的内容将被隐藏。')) return;
    setSaving(true);
    try {
      const res = await spaces.deleteModule(namespace, moduleKey);
      if (res.code === 0 && res.data?.deleted) {
        setModules(prev => prev.filter(m => m.module_key !== moduleKey));
      }
    } catch (e) { console.error('Failed to delete module:', e); }
    setSaving(false);
  };

  const startEdit = (m: SpaceModule) => {
    setEditingKey(m.module_key);
    setEditName(m.name);
    setEditMode(m.mode);
    setEditTypes(m.allowed_content_types);
  };

  const ContentTypeTag = ({ t }: { t: string }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
      t === 'video' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    }`}>
      {t === 'video' ? <Video className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
      {t === 'video' ? '视频' : '文章'}
    </span>
  );

  const ModeTag = ({ mode }: { mode: string }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
      mode === 'creator_only'
        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    }`}>
      {mode === 'creator_only' ? <Users className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
      {mode === 'creator_only' ? '仅创建者' : '自由模式'}
    </span>
  );

  if (loading) return <div className="py-8 text-center text-gray-400">加载中...</div>;

  return (
    <div className="space-y-4">
      {/* Current modules */}
      {modules.length === 0 ? (
        <div className="py-8 text-center text-gray-400">
          <p className="mb-2">还没有自定义模块</p>
          <button onClick={() => setShowAdd(true)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >添加第一个模块</button>
        </div>
      ) : (
        <div className="space-y-2">
          {modules.map(m => (
            <div key={m.module_key} className="glass-card p-4">
              {editingKey === m.module_key ? (
                /* Edit form */
                <div className="space-y-3">
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                    maxLength={10} placeholder="模块名称 (最多10字)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm" />
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="radio" name={`mode-${m.module_key}`} value="free"
                        checked={editMode === 'free'} onChange={e => setEditMode(e.target.value)} />
                      <Globe className="w-3.5 h-3.5 text-green-600" /> 自由模式
                    </label>
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="radio" name={`mode-${m.module_key}`} value="creator_only"
                        checked={editMode === 'creator_only'} onChange={e => setEditMode(e.target.value)} />
                      <Users className="w-3.5 h-3.5 text-purple-600" /> 仅创建者
                    </label>
                  </div>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" checked={editTypes.includes('article')}
                        onChange={e => {
                          if (e.target.checked) setEditTypes([...editTypes, 'article']);
                          else setEditTypes(editTypes.filter(t => t !== 'article'));
                        }} />
                      <FileText className="w-3.5 h-3.5 text-blue-600" /> 文章
                    </label>
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" checked={editTypes.includes('video')}
                        onChange={e => {
                          if (e.target.checked) setEditTypes([...editTypes, 'video']);
                          else setEditTypes(editTypes.filter(t => t !== 'video'));
                        }} />
                      <Video className="w-3.5 h-3.5 text-red-600" /> 视频
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(m.module_key)} disabled={saving}
                      className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
                    >保存</button>
                    <button onClick={() => setEditingKey(null)}
                      className="px-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                    >取消</button>
                  </div>
                </div>
              ) : (
                /* Module display */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{m.name}</span>
                        <ModeTag mode={m.mode} />
                        {(m.allowed_content_types ?? []).map(t => <ContentTypeTag key={t} t={t} />)}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">key: {m.module_key}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEdit(m)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(m.module_key)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add module form */}
      {showAdd ? (
        <div className="glass-card p-4 border-2 border-dashed border-blue-300 dark:border-blue-700">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">新建模块</h4>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              maxLength={10} placeholder="模块名称 (最多10字)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm" />
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5 text-sm">
                <input type="radio" name="new-mode" value="free"
                  checked={newMode === 'free'} onChange={e => setNewMode(e.target.value)} />
                <Globe className="w-3.5 h-3.5 text-green-600" /> 自由模式 — 任何人都可发布
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input type="radio" name="new-mode" value="creator_only"
                  checked={newMode === 'creator_only'} onChange={e => setNewMode(e.target.value)} />
                <Users className="w-3.5 h-3.5 text-purple-600" /> 仅创建者 — 类似公众号
              </label>
            </div>
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={newTypes.includes('article')}
                  onChange={e => {
                    if (e.target.checked) setNewTypes([...newTypes, 'article']);
                    else setNewTypes(newTypes.filter(t => t !== 'article'));
                  }} />
                <FileText className="w-3.5 h-3.5 text-blue-600" /> 文章
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={newTypes.includes('video')}
                  onChange={e => {
                    if (e.target.checked) setNewTypes([...newTypes, 'video']);
                    else setNewTypes(newTypes.filter(t => t !== 'video'));
                  }} />
                <Video className="w-3.5 h-3.5 text-red-600" /> 视频
              </label>
            </div>
            <button onClick={handleAdd} disabled={saving || !newName.trim() || newTypes.length === 0}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
            >创建模块</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
          <Plus className="w-4 h-4" /> 添加自定义模块
        </button>
      )}
    </div>
  );
}

// 保留旧接口兼容性
export type { SpaceModule };
