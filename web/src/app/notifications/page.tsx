'use client';

import { useEffect, useState } from 'react';
import { Heart, MessageCircle, UserPlus, Bell, CheckCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => { fetchNotifs(); fetchUnread(); }, []);

  const token = () => localStorage.getItem('polis_access_token');

  const fetchNotifs = async () => {
    const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    if (data.code === 0) setNotifs(data.data || []);
  };

  const fetchUnread = async () => {
    const res = await fetch('/api/notifications/unread-count', { headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    if (data.code === 0) setUnreadCount(data.data);
  };

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', {
      method: 'POST', headers: { Authorization: `Bearer ${token()}` },
    });
    setNotifs(notifs.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="h-4 w-4 text-red-500" />;
      case 'comment': return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'follow': return <UserPlus className="h-4 w-4 text-green-500" />;
      default: return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">通知</h1>
          {unreadCount > 0 && <p className="text-sm text-gray-500 mt-1">{unreadCount} 条未读</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
            <CheckCheck className="h-3.5 w-3.5" /> 全部已读
          </button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="card py-16 text-center">
          <Bell className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">暂无通知</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n: any) => (
            <div key={n.id} className={`card flex items-start gap-3 py-3 px-4 ${!n.is_read ? 'bg-primary-50/50 border-primary-200' : ''}`}>
              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">{n.content}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(n.created_at)}</p>
              </div>
              {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary-500 shrink-0 mt-1.5" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
