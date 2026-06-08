'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings, Users, BarChart3, ImageIcon, ArrowLeft } from 'lucide-react';
import SpaceModulesManager from '@/components/SpaceSettings';
import { JoinRequestsPanel } from '@/components/JoinRequestsPanel';
import { SpaceAnalytics } from '@/components/SpaceAnalytics';
import { MemberActions } from '@/components/MemberActions';
import { toastSuccess, toastError } from '@/stores/toastStore';
import type { SpaceMember } from '@/lib/api';
import { spaces as apiSpaces, getToken, type Space } from '@/lib/api';

type TabId = 'basic' | 'modules' | 'members' | 'approvals' | 'analytics';

export default function ManagePageClient({ rawNamespace }: { rawNamespace: string | string[] }) {
  const router = useRouter();

  const namespace = useMemo(() => {
    if (!rawNamespace) return '';
    if (Array.isArray(rawNamespace)) {
      return (rawNamespace as string[]).map(s => {
        try { return decodeURIComponent(s); } catch { return s; }
      }).join('/');
    }
    try { return decodeURIComponent(rawNamespace as string); } catch { return rawNamespace as string; }
  }, [rawNamespace]);

  const [space, setSpace] = useState<Space | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [saving, setSaving] = useState(false);

  // Basic info form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');

  // Icons
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/login'); return; }

    apiSpaces.get(namespace).then(res => {
      if (res.code === 0 && res.data) {
        const s = res.data;

        // 直接在回调中校验 owner 身份，避免 React 批处理导致的竞态
        try {
          const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(atob(b64));
          if (s.owner_id !== payload.sub) {
            router.push(`/space/${namespace}`);
            return;
          }
        } catch {
          router.push(`/space/${namespace}`);
          return;
        }

        setSpace(s);
        setTitle(s.title);
        setDescription(s.description);
        setVisibility(s.visibility);
        setLoading(false);
      } else {
        router.push(`/space/${namespace}`);
      }
    }).catch(() => router.push(`/space/${namespace}`));
  }, [namespace, router]);

  useEffect(() => {
    if (!space) return;
    setMembersLoading(true);
    import('@/lib/api').then(({ spaces }) => {
      spaces.members(namespace).then(res => {
        if (res.code === 0 && res.data) setMembers(res.data);
      }).finally(() => setMembersLoading(false));
    }).catch(() => setMembersLoading(false));
  }, [space, namespace]);

  const handleSaveBasic = async () => {
    setSaving(true);
    try {
      let icon_url: string | undefined;
      let banner_url: string | undefined;

      if (iconFile) {
        const base64 = await fileToBase64(iconFile);
        const res = await apiSpaces.uploadFile(namespace, iconFile.name, base64, iconFile.type);
        if (res.code === 0 && res.data) icon_url = `/api/files/${res.data.id}`;
      }

      if (bannerFile) {
        const base64 = await fileToBase64(bannerFile);
        const res = await apiSpaces.uploadFile(namespace, bannerFile.name, base64, bannerFile.type);
        if (res.code === 0 && res.data) banner_url = `/api/files/${res.data.id}`;
      }

      const res = await apiSpaces.update(namespace, {
        title: title.trim(),
        description: description.trim(),
        visibility,
        ...(icon_url !== undefined ? { icon_url } : {}),
        ...(banner_url !== undefined ? { banner_url } : {}),
      });

      if (res.code === 0 && res.data) {
        setSpace(res.data);
        toastSuccess('保存成功');
      } else {
        toastError('保存失败');
      }
    } catch (e: any) {
      toastError(e?.message || '保存失败');
    }
    setSaving(false);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400"><span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2 align-middle"></span>加载中...</div>;
  }

  if (!space) return null;

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'basic', label: '基本信息', icon: Settings },
    { id: 'modules', label: '模块设置', icon: () => <span className="text-sm">🧩</span> },
    { id: 'members', label: '成员管理', icon: Users },
    { id: 'approvals', label: '加入审批', icon: () => <span className="text-sm">📋</span> },
    { id: 'analytics', label: '数据概览', icon: BarChart3 },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/space/${namespace}`} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">管理社区</h1>
        <span className="text-gray-400 dark:text-gray-500">— {space.title}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="glass-card p-6">
        {activeTab === 'basic' && (
          <div className="space-y-6 max-w-lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">基本信息</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">社区名称</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={50}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">简介</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">可见性</label>
              <select
                value={visibility}
                onChange={e => setVisibility(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="public">公开 — 所有人可见</option>
                <option value="unlisted">不公开 — 仅链接可访问</option>
                <option value="private">私有 — 仅成员可见</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">图标</label>
              <div className="flex items-center gap-3">
                {space.icon_url && (
                  <img src={space.icon_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setIconFile(e.target.files?.[0] || null)}
                  className="text-sm text-gray-500 dark:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">封面</label>
              <div className="flex items-center gap-3">
                {space.banner_url && (
                  <img src={space.banner_url} alt="" className="w-24 h-12 rounded object-cover" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setBannerFile(e.target.files?.[0] || null)}
                  className="text-sm text-gray-500 dark:text-gray-400"
                />
              </div>
            </div>

            <button
              onClick={handleSaveBasic}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        )}

        {activeTab === 'modules' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">模块设置</h2>
            <SpaceModulesManager namespace={namespace} />
          </div>
        )}

        {activeTab === 'members' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">成员管理</h2>
            {membersLoading ? (
              <div className="py-8 text-center text-gray-400"><span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2 align-middle"></span>加载中...</div>
            ) : members.length > 0 ? (
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.user.id} className="glass-card flex items-center gap-3 overflow-visible">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm">
                        {(m.user.display_name || m.user.username).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {m.user.display_name || m.user.username}
                          </span>
                          {m.user.verified && <span className="text-blue-500 text-xs">✓</span>}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">@{m.user.username}</p>
                      </div>
                    </div>
                    {m.role !== 'owner' && (
                      <MemberActions
                        namespace={namespace}
                        userId={m.user.id}
                        username={m.user.username}
                        currentRole={m.role}
                        onAction={() => {
                          import('@/lib/api').then(({ spaces }) => {
                            spaces.members(namespace).then(res => {
                              if (res.code === 0 && res.data) setMembers(res.data);
                            });
                          });
                        }}
                      />
                    )}
                    {m.role === 'owner' && (
                      <span className="text-xs px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">创建者</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400">👥 暂无成员</div>
            )}
          </div>
        )}

        {activeTab === 'approvals' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">加入审批</h2>
            <JoinRequestsPanel namespace={namespace} />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">数据概览</h2>
            <SpaceAnalytics namespace={namespace} spaceTitle={space.title} />
          </div>
        )}
      </div>
    </div>
  );
}
