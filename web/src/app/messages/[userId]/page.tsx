'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Send } from 'lucide-react';
import { messages, users, type DirectMessage, type User as UserType } from '@/lib/api';

export default function ConversationPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [msgs, setMsgs] = useState<DirectMessage[]>([]);
  const [otherUser, setOtherUser] = useState<UserType | null>(null);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('polis_access_token');
    if (!token) { setLoading(false); return; }
    setIsLoggedIn(true);

    // Get current user from stored data or token
    try {
      const userData = localStorage.getItem('polis_user');
      if (userData) {
        const u = JSON.parse(userData);
        setCurrentUserId(u.id || '');
      }
    } catch {}

    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load user profile
      try {
        const profileRes = await users.getProfile(userId);
        // profile returns user by ID or username... hmm, this might not work. Let's try fetching by user ID from messages API
        // Actually getProfile expects username. We need the username from somewhere.
        // Since we're navigating from conversations list which has the user data, we might not have it.
        // Fallback: just display the user ID
      } catch {}

      // Load conversation messages
      const res = await messages.getConversation(userId);
      if (res.code === 0 && Array.isArray(res.data)) {
        setMsgs(res.data);
        // Mark as read
        await messages.markRead(userId);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Load user info from conversations list or via ID
  useEffect(() => {
    if (!isLoggedIn) return;
    const loadUser = async () => {
      try {
        const convRes = await messages.getConversations();
        if (convRes.code === 0 && Array.isArray(convRes.data)) {
          const conv = convRes.data.find((c: any) => c.other_user.id === userId);
          if (conv?.other_user) {
            setOtherUser(conv.other_user);
            return;
          }
        }
        // Fallback: try to find user by username via search
        try {
          const searchRes = await fetch(`/api/users/search?q=${encodeURIComponent(userId)}&limit=1`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('polis_access_token')}` }
          });
          const data = await searchRes.json();
          if (data.code === 0 && Array.isArray(data.data) && data.data.length > 0) {
            setOtherUser(data.data[0]);
          } else {
            // Just use the ID as display name
            setOtherUser({ id: userId, username: userId.substring(0, 8), display_name: userId.substring(0, 8), avatar_url: null, bio: '', verified: false, created_at: '' });
          }
        } catch {
          setOtherUser({ id: userId, username: userId.substring(0, 8), display_name: userId.substring(0, 8), avatar_url: null, bio: '', verified: false, created_at: '' });
        }
      } catch {}
    };
    loadUser();
  }, [userId, isLoggedIn]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  // Auto refresh every 5s
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => {
      messages.getConversation(userId).then(res => {
        if (res.code === 0 && Array.isArray(res.data)) {
          setMsgs(res.data);
        }
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [userId, isLoggedIn]);

  const handleSend = async () => {
    const trimmed = newMsg.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await messages.send(userId, trimmed);
      if (res.code === 0 && res.data) {
        setMsgs(prev => [res.data!, ...prev]);
      }
      setNewMsg('');
      inputRef.current?.focus();
    } catch (e: any) {
      alert(e.message || '发送失败');
    } finally {
      setSending(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 dark:text-gray-400">请先登录</p>
        <Link href="/login" className="mt-4 inline-block btn-primary px-6 py-2">登录</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <Link href="/messages" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden">
            {otherUser?.avatar_url ? (
              <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="h-4 w-4 text-primary-500" />
            )}
          </div>
          <Link href={`/profile/${otherUser?.username || otherUser?.id}`} className="font-medium text-gray-900 dark:text-white text-sm hover:underline">
            {otherUser?.display_name || otherUser?.username || '用户'}
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : msgs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 dark:text-gray-500 text-sm">暂无消息，发送第一条私信吧</p>
          </div>
        ) : (
          [...msgs].reverse().map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  isMe
                    ? 'bg-primary-500 text-white rounded-br-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
                }`}>
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  <div className={`text-[10px] mt-1 ${isMe ? 'text-primary-100' : 'text-gray-400 dark:text-gray-500'}`}>
                    {formatMsgTime(msg.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        <input
          ref={inputRef}
          type="text"
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="输入消息..."
          className="flex-1 rounded-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 py-2.5 px-4 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-200"
        />
        <button
          onClick={handleSend}
          disabled={!newMsg.trim() || sending}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function formatMsgTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) {
      return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}
