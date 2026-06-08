'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, Check, X, Users } from 'lucide-react';
import { spaces } from '@/lib/api';

interface JoinRequest {
  user_id: string;
  username: string;
  display_name: string;
  status: string;
  message: string | null;
  created_at: string;
}

interface Props {
  namespace: string;
}

export function JoinRequestsPanel({ namespace }: Props) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await spaces.joinRequests(namespace);
      if (res.code === 0 && Array.isArray(res.data)) {
        setRequests(res.data);
      }
    } catch (e) { console.error('[JoinRequestsPanel] fetchRequests:', e); } finally {
      setLoading(false);
    }
  }, [namespace]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleReview = async (userId: string, approved: boolean) => {
    setProcessing(userId);
    try {
      const res = await spaces.reviewJoinRequest(namespace, userId, approved);
      if (res.code === 0) {
        setRequests(prev => prev.filter(r => r.user_id !== userId));
      }
    } catch (e) { console.error('[JoinRequestsPanel] handleReview:', e); } finally {
      setProcessing(null);
    }
  };

  if (loading) return null;
  if (requests.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          加入申请 ({requests.length})
        </h3>
      </div>
      <div className="space-y-2">
        {requests.map((req) => (
          <div key={req.user_id} className="glass-card flex items-center gap-3 p-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
              {(req.display_name || req.username).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {req.display_name || req.username}
              </p>
              <p className="text-xs text-gray-400">@{req.username}</p>
              {req.message && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                  &ldquo;{req.message}&rdquo;
                </p>
              )}
              <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {new Date(req.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleReview(req.user_id, true)}
                disabled={processing === req.user_id}
                className="p-1.5 rounded-lg text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                title="通过"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleReview(req.user_id, false)}
                disabled={processing === req.user_id}
                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="拒绝"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
