'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, UserPlus, Bell, CheckCheck, ChevronRight, Pin, Star, Send, Trash2, Square, CheckSquare, Compass } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/api';

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => { fetchNotifs(); fetchUnread(); }, []);

  const token = () => getToken();

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
    setNotifs(Array.isArray(notifs) ? notifs.map((n) => ({ ...n, is_read: true })) : notifs);
    setUnreadCount(0);
  };

  const markOneRead = async (notifId: string) => {
    if (markingIds.has(notifId)) return;
    setMarkingIds((prev) => new Set(prev).add(notifId));
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ notification_id: notifId }),
      });
      setNotifs((prev) => Array.isArray(prev) ? prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n)) : prev);
      fetchUnread();
    } catch {}
    finally {
      setMarkingIds((prev) => {
        const next = new Set(prev);
        next.delete(notifId);
        return next;
      });
    }
  };

  // ==== Selection ====

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === notifs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(Array.isArray(notifs) ? notifs.map((n) => n.id) : []));
    }
  };

  // ==== Delete ====

  const deleteSelected = async () => {
    if (selectedIds.size === 0 || deleting) return;
    setDeleting(true);
    try {
      await fetch('/api/notifications/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      setNotifs((prev) => prev.filter((n) => !selectedIds.has(n.id)));
      setSelectedIds(new Set());
      fetchUnread();
    } catch {}
    finally { setDeleting(false); }
  };

  const deleteOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleting) return;
    setDeleting(true);
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      setNotifs((prev) => prev.filter((n) => n.id !== id));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      fetchUnread();
    } catch {}
    finally { setDeleting(false); }
  };

  /** Navigate to the target content based on notification type */
  const handleClick = (n: any) => {
    if (!n.is_read) markOneRead(n.id);

    const targetType = n.target_type;
    const targetId = n.target_id;

    if (targetType === 'post' && targetId) {
      router.push(`/post/${targetId}`);
    } else if (targetType === 'reference' && targetId) {
      router.push(`/post/${targetId}`);
    } else if (targetType === 'user' && targetId) {
      router.push(`/profile/${n.actor?.username || ''}`);
    } else if (targetType === 'space' && targetId) {
      router.push(`/space/${targetId}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="h-4 w-4 text-red-500" />;
      case 'comment': return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'follow': return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'pin': return <Pin className="h-4 w-4 text-amber-500" />;
      case 'featured': return <Star className="h-4 w-4 text-purple-500" />;
      case 'reference': return <Send className="h-4 w-4 text-cyan-500" />;
      case 'reference_review': return <CheckCheck className="h-4 w-4 text-emerald-500" />;
      default: return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const allSelected = notifs.length > 0 && selectedIds.size === notifs.length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">通知</h1>
          {unreadCount > 0 && <p className="text-sm text-gray-500 mt-1">{unreadCount} 条未读</p>}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
              <CheckCheck className="h-3.5 w-3.5" /> 全部已读
            </button>
          )}
          {selectedIds.size > 0 && (
            <button
              onClick={deleteSelected}
              disabled={deleting}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? '...' : `删除(${selectedIds.size})`}
            </button>
          )}
        </div>
      </div>

      {notifs.length > 0 && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {allSelected ? <CheckSquare className="h-4 w-4 text-primary-500" /> : <Square className="h-4 w-4" />}
            全选
          </button>
        </div>
      )}

      {notifs.length === 0 ? (
        <div className="glass-card p-6 py-16 text-center">
          <Bell className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">暂无通知</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            关注社区或与他人互动后，相关通知会显示在这里
          </p>
          <Link href="/explore" className="btn-primary text-sm mt-4 inline-flex items-center gap-1.5 px-5 py-2 rounded-full">
            <Compass className="h-3.5 w-3.5" /> 探索社区
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n: any) => (
            <div
              key={n.id}
              className={`w-full glass-card flex items-start gap-3 py-3 px-4 transition-colors group ${!n.is_read ? 'border-primary-300 dark:border-primary-600 bg-primary-50/50 dark:bg-primary-900/20' : 'hover:border-primary-300 dark:hover:border-primary-500'}`}
            >
              {/* Checkbox */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleSelect(n.id); }}
                className="shrink-0 mt-1 text-gray-300 hover:text-primary-500 dark:text-gray-600 dark:hover:text-primary-400 transition-colors"
              >
                {selectedIds.has(n.id)
                  ? <CheckSquare className="h-5 w-5 text-primary-500" />
                  : <Square className="h-5 w-5" />
                }
              </button>

              {/* Content — clickable to navigate */}
              <button onClick={() => handleClick(n)} className="flex items-start gap-3 flex-1 min-w-0 text-left">
                <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-200">{n.content}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(n.created_at)}</p>
                </div>
              </button>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary-500" />}
                <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                <button
                  onClick={(e) => deleteOne(n.id, e)}
                  disabled={deleting}
                  className="ml-1 p-1 rounded-md text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  title="删除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
