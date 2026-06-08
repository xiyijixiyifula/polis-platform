'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Shield, ToggleLeft, ToggleRight, Edit3, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toastError } from '@/stores/toastStore';

interface ReviewRule {
  id: string;
  name: string;
  description?: string;
  rule_type: string;
  config: Record<string, unknown>;
  target_types: string[];
  priority: number;
  is_active: boolean;
  created_at: string;
}

const RULE_TYPE_LABELS: Record<string, string> = {
  keyword_filter: '关键词过滤',
  sensitivity_score: '敏感度评分',
  frequency_limit: '频率限制',
  agent_auto: 'Agent 自动',
};

export default function AdminReviewRulesPage() {
  const [rules, setRules] = useState<ReviewRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState('keyword_filter');
  const [formConfig, setFormConfig] = useState('{}');
  const [formTargets, setFormTargets] = useState('["post","comment"]');
  const [formPriority, setFormPriority] = useState(0);
  const [formError, setFormError] = useState('');

  useEffect(() => { fetchRules(); }, []);

  const fetchRules = async () => {
    const token = localStorage.getItem('polis_admin_token');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/review-rules', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) setRules(data.data || []);
    } catch (e) { if (process.env.NODE_ENV === 'development') console.error('[Review Rules]', e); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setFormName(''); setFormDesc(''); setFormType('keyword_filter');
    setFormConfig('{}'); setFormTargets('["post","comment"]'); setFormPriority(0);
    setFormError(''); setEditingId(null);
  };

  const openCreate = () => { resetForm(); setShowForm(true); };

  const openEdit = (rule: ReviewRule) => {
    setFormName(rule.name);
    setFormDesc(rule.description || '');
    setFormType(rule.rule_type);
    setFormConfig(JSON.stringify(rule.config, null, 2));
    setFormTargets(JSON.stringify(rule.target_types));
    setFormPriority(rule.priority);
    setEditingId(rule.id);
    setShowForm(true);
  };

  const doSave = async () => {
    const token = localStorage.getItem('polis_admin_token');
    setFormError('');

    if (!formName.trim()) { setFormError('规则名称不能为空'); return; }
    let config: unknown;
    let targetTypes: unknown;
    try { config = JSON.parse(formConfig); } catch { setFormError('配置 JSON 格式错误'); return; }
    try { targetTypes = JSON.parse(formTargets); } catch { setFormError('目标类型 JSON 格式错误'); return; }

    try {
      const url = editingId
        ? `/api/admin/review-rules/${editingId}`
        : '/api/admin/review-rules';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDesc.trim() || null,
          rule_type: formType,
          config,
          target_types: targetTypes,
          priority: formPriority,
        }),
      });
      const data = await res.json();
      if (data.code === 0) { fetchRules(); setShowForm(false); resetForm(); }
      else setFormError(data.message || '保存失败');
    } catch (e) { setFormError('网络错误'); }
  };

  const doToggle = async (ruleId: string, isActive: boolean) => {
    const token = localStorage.getItem('polis_admin_token');
    try {
      const res = await fetch(`/api/admin/review-rules/${ruleId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !isActive }),
      });
      const data = await res.json();
      if (data.code === 0) fetchRules();
      else toastError('操作失败: ' + data.message);
    } catch (e) { if (process.env.NODE_ENV === 'development') console.error('[Toggle Rule]', e); }
  };

  const doDelete = async (ruleId: string) => {
    if (!confirm('确定删除此规则？')) return;
    const token = localStorage.getItem('polis_admin_token');
    try {
      const res = await fetch(`/api/admin/review-rules/${ruleId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.code === 0) fetchRules();
      else toastError('删除失败: ' + data.message);
    } catch (e) { if (process.env.NODE_ENV === 'development') console.error('[Delete Rule]', e); }
  };

  if (loading && rules.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">审查规则</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">配置自动审核策略，Agent 将读取这些规则执行审查</p>
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
          <Plus className="h-4 w-4" /> 新建规则
        </button>
      </div>

      {/* Rules table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">规则名称</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">类型</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">目标</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">优先级</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">状态</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">创建时间</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">操作</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  暂无审查规则，点击右上角新建
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!rule.is_active ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{rule.name}</div>
                    {rule.description && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{rule.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">
                      {RULE_TYPE_LABELS[rule.rule_type] || rule.rule_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {(rule.target_types || []).map((t: string) => (
                      <span key={t} className="inline-block mr-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs">{t}</span>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">{rule.priority}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => doToggle(rule.id, rule.is_active)}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                        rule.is_active
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                      }`}>
                      {rule.is_active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                      {rule.is_active ? '启用' : '禁用'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(rule.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(rule)}
                        className="text-xs px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/40">
                        <Edit3 className="h-3 w-3 inline mr-1" />编辑
                      </button>
                      <button onClick={() => doDelete(rule.id)}
                        className="text-xs px-2.5 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800/40">
                        <Trash2 className="h-3 w-3 inline" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editingId ? '编辑规则' : '新建审查规则'}</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">名称 *</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  className="input-field w-full" placeholder="例如：敏感词过滤" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">描述</label>
                <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                  className="input-field w-full" placeholder="规则说明（可选）" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">规则类型</label>
                <select value={formType} onChange={(e) => setFormType(e.target.value)} className="input-field w-full">
                  {Object.entries(RULE_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">目标类型 (JSON)</label>
                <input type="text" value={formTargets} onChange={(e) => setFormTargets(e.target.value)}
                  className="input-field w-full font-mono text-sm" placeholder='["post","comment"]' />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">配置 (JSON)</label>
                <textarea value={formConfig} onChange={(e) => setFormConfig(e.target.value)}
                  className="input-field w-full font-mono text-sm h-32" placeholder='{"keywords": ["敏感词1"], "action": "hide"}' />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">优先级</label>
                <input type="number" value={formPriority} onChange={(e) => setFormPriority(parseInt(e.target.value) || 0)}
                  className="input-field w-24" />
              </div>

              {formError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">{formError}</div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">取消</button>
                <button onClick={doSave}
                  className="px-4 py-2 text-sm bg-primary-600 text-white hover:bg-primary-700 rounded-lg">
                  {editingId ? '更新' : '创建'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
