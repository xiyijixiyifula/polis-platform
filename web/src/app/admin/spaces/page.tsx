'use client';

import { useEffect, useState } from 'react';
import { Search, Archive, Eye } from 'lucide-react';
import { formatDate, formatCount } from '@/lib/utils';

interface Space {
  id: string; namespace: string; title: string;
  owner_id: string | null; is_root: boolean;
  visibility: string; status: string;
  member_count: number; post_count: number;
  created_at: string;
}

export default function AdminSpacesPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchSpaces(); }, []);

  const fetchSpaces = async () => {
    const token = localStorage.getItem('polis_admin_token');
    try {
      const res = await fetch('/api/admin/spaces?page=1&page_size=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) setSpaces(data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const archiveSpace = async (spaceId: string) => {
    const token = localStorage.getItem('polis_admin_token');
    await fetch(`/api/admin/spaces/${spaceId}/archive`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
    fetchSpaces();
  };

  const filtered = spaces.filter((s) =>
    s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.namespace?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">社区管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理平台所有社区</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="搜索社区..." className="input-field pl-10 w-64"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((space) => (
          <div key={space.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold">
                {space.title?.charAt(0) || '?'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{space.title}</h3>
                  {space.is_root && <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">根社区</span>}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    space.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>{space.status}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    space.visibility === 'public' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>{space.visibility}</span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">/{space.namespace}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span>👥 {formatCount(space.member_count)}</span>
                  <span>📝 {formatCount(space.post_count)}</span>
                  <span>📅 {formatDate(space.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href={`/space/${space.namespace}`} target="_blank"
                className="btn-secondary text-xs px-3 py-1.5"><Eye className="h-3 w-3 inline" /> 查看</a>
              {space.status === 'active' && (
                <button onClick={() => archiveSpace(space.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50">
                  <Archive className="h-3 w-3 inline" /> 归档
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
