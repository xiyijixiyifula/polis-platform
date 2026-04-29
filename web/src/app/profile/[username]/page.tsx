'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { users, spaces, type User } from '@/lib/api';

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const [user, setUser] = useState<User | null>(null);
  const [userSpaces, setUserSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    (async () => {
      try {
        const res = await users.getProfile(username);
        if (res.code === 0 && res.data) {
          setUser(res.data);
        } else {
          setError('用户不存在');
        }
      } catch {
        setError('加载失败');
      }

      try {
        const token = localStorage.getItem('polis_access_token');
        const spRes = await fetch('/api/users/' + username + '/spaces', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const spData = await spRes.json();
        if (spData.code === 0 && spData.data) {
          setUserSpaces(spData.data);
        }
      } catch {}

      setLoading(false);
    })();
  }, [username]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="card animate-pulse space-y-4">
          <div className="h-20 w-20 bg-gray-200 rounded-full" />
          <div className="h-6 w-1/3 bg-gray-200 rounded" />
          <div className="h-4 w-1/2 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center">
        <div className="text-4xl mb-4">😕</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{error || '用户不存在'}</h2>
        <Link href="/" className="text-sm text-primary-600 hover:underline">返回首页</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="h-20 w-20 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-3xl">
            {user.display_name?.charAt(0) || '?'}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{user.display_name}</h1>
                <p className="text-sm text-gray-500">@{user.username}</p>
              </div>
              <button className="btn-primary text-sm px-5 py-2">关注</button>
            </div>
            {user.bio && (
              <p className="mt-2 text-sm text-gray-600">{user.bio}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(user.created_at)} 加入
              </span>
              {user.verified && (
                <span className="inline-flex items-center gap-0.5 text-blue-600 font-medium">✓ 已认证</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {userSpaces.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">参与的社区</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {userSpaces.map((sp: any) => (
              <Link
                key={sp.id || sp.namespace}
                href={`/space/${sp.namespace || sp.slug || sp.id}`}
                className="card hover:shadow-md transition-shadow group"
              >
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  {sp.title || sp.name || sp.namespace}
                </h3>
                {sp.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{sp.description}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {!loading && userSpaces.length === 0 && (
        <div className="mt-6 card py-8 text-center text-gray-500">
          <p className="text-sm">该用户还没有加入任何社区</p>
        </div>
      )}
    </div>
  );
}
