'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, User, Send, Pin, Trash2, Search, X, Eraser } from 'lucide-react';
import { messages, users, getToken, type DirectMessage } from '@/lib/api';
import { toastError } from '@/stores/toastStore';

export default function ConversationPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [msgs, setMsgs] = useState<DirectMessage[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<DirectMessage[] | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    setIsLoggedIn(true);

    try {
      const userData = localStorage.getItem('polis_user');
      if (userData) {
        const u = JSON.parse(userData);
        setCurrentUserId(u.id || '');
      }
    } catch (e) { console.error('[component] error:', e); }

    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await messages.getConversation(userId);
      if (res.code === 0 && Array.isArray(res.data)) {
        setMsgs(res.data);
        await messages.markRead(userId);
      }
    } catch (e: any) {
      if (process.env.NODE_ENV === 'development') if (process.env.NODE_ENV === 'development') console.error(e);
    } finally {
      setLoading(false);
    }
  };

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
        try {
          const searchRes = await fetch(`/api/users/search?q=${encodeURIComponent(userId)}&limit=1`, {
            headers: { Authorization: `Bearer ${getToken()}` }
          });
          const data = await searchRes.json();
          if (data.code === 0 && Array.isArray(data.data) && data.data.length > 0) {
            setOtherUser(data.data[0]);
          } else {
            setOtherUser({ id: userId, username: '未知用户', display_name: '未知用户', avatar_url: null, bio: '', verified: false, created_at: '' });
          }
        } catch (e) {
          console.error('[component] error:', e);
          setOtherUser({ id: userId, username: '未知用户', display_name: '未知用户', avatar_url: null, bio: '', verified: false, created_at: '' });
        }
      } catch (e) { console.error('[component] error:', e); }
    };
    loadUser();
  }, [userId, isLoggedIn]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => {
      messages.getConversation(userId).then(res => {
        if (res.code === 0 && Array.isArray(res.data)) {
          setMsgs(res.data);
        }
      }).catch((e) => { console.error('[api] error:', e); });
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
      toastError(e.message || '发送失败');
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = async () => {
    if (!confirm('确定要清除所有聊天记录吗？此操作不可撤销。')) return;
    try {
      const res = await messages.deleteConversation(userId);
      if (res.code === 0) {
        setMsgs([]);
      }
    } catch (e) { console.error('[api] error:', e); }
  };

  const handleTogglePin = async (msgId: string) => {
    try {
      const res = await messages.togglePin(msgId);
      if (res.code === 0) {
        loadData();
      }
    } catch (e) { console.error('[api] error:', e); }
  };

  const handleDelete = async (msgId: string) => {
    if (!confirm('确定要删除这条消息吗？')) return;
    try {
      const res = await fetch(`/api/messages/${msgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setMsgs(prev => prev.filter(m => m.id !== msgId));
      }
    } catch (e) { console.error('[api] error:', e); }
  };

  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    try {
      const res = await messages.search(searchQ.trim(), userId);
      if (res.code === 0 && Array.isArray(res.data)) {
        setSearchResults(res.data);
      }
    } catch (e) { console.error('[api] error:', e); }
  };

  // Separate pinned from regular messages
  const pinnedMsgs = msgs.filter(m => m.is_pinned);
  const regularMsgs = msgs.filter(m => !m.is_pinned);

  if (!isLoggedIn) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 dark:text-gray-400">请先登录</p>
        <Link href="/login" className="mt-4 inline-block btn-primary px-6 py-2">登录</Link>
      </div>
    );
  }

  const displayMsgs = searchResults !== null ? searchResults : regularMsgs;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <Link href="/messages" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden">
            {otherUser?.avatar_url ? (
              <Image src={otherUser.avatar_url!} alt="" width={32} height={32} className="w-full h-full object-cover" unoptimized />
            ) : (
              <User className="h-4 w-4 text-primary-500" />
            )}
          </div>
          <Link href={`/profile/${otherUser?.username || otherUser?.id}`} className="font-medium text-gray-900 dark:text-white text-sm hover:underline">
            {otherUser?.display_name || otherUser?.username || '用户'}
          </Link>
        </div>
        {/* Clear chat */}
        <button onClick={handleClearChat} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="清除聊天记录">
          <Eraser className="h-4 w-4" />
        </button>
        {/* Search toggle */}
        <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Search className="h-4 w-4" />
        </button>
      </div>

      {/* Search bar (toggle) */}
      {showSearch && (
        <div className="flex items-center gap-2 py-2 border-b border-gray-200 dark:border-gray-700">
          <input
            type="text"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="在当前对话中搜索..."
            className="flex-1 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
          />
          <button onClick={handleSearch} className="px-3 py-1.5 text-xs rounded-full bg-primary-500 text-white hover:bg-primary-600 transition-colors">搜索</button>
          {searchResults !== null && (
            <button onClick={() => { setSearchResults(null); setSearchQ(''); }} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Pinned messages */}
      {pinnedMsgs.length > 0 && searchResults === null && (
        <div className="border-b border-gray-100 dark:border-gray-800 py-2">
          <div className="flex items-center gap-1 text-xs text-gray-400 mb-1 px-1">
            <Pin className="h-3 w-3" /> 已置顶 ({pinnedMsgs.length})
          </div>
          <div className="space-y-1">
            {pinnedMsgs.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative`}>
                  <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 rounded-br-md'
                      : 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-100 rounded-bl-md'
                  }`}>
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    <div className="text-[10px] mt-1 text-amber-500 dark:text-amber-400">
                      📌 {formatMsgTime(msg.created_at)}
                    </div>
                  </div>
                  <button onClick={() => handleTogglePin(msg.id)} className="absolute -top-1 -right-1 p-0.5 rounded-full bg-white dark:bg-gray-800 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-amber-500" title="取消置顶">
                    <Pin className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-400"><span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2 align-middle"></span>加载中...</div>
        ) : displayMsgs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              {searchResults !== null ? '🔍 未找到匹配的消息' : '💬 暂无消息，发送第一条私信吧'}
            </p>
          </div>
        ) : (
          [...displayMsgs].reverse().map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  isMe
                    ? 'bg-primary-500 text-white rounded-br-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
                }`}>
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  <div className={`text-[10px] mt-1 flex items-center gap-1 ${isMe ? 'text-primary-100' : 'text-gray-400 dark:text-gray-500'}`}>
                    {msg.is_pinned && <Pin className="h-2.5 w-2.5" />}
                    {formatMsgTime(msg.created_at)}
                  </div>
                </div>
                {/* Action buttons on hover */}
                <div className={`absolute top-0 ${isMe ? '-left-16' : '-right-16'} hidden group-hover:flex items-center gap-0.5`}>
                  <button onClick={() => handleTogglePin(msg.id)} className="p-1 rounded text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title={msg.is_pinned ? '取消置顶' : '置顶'}>
                    <Pin className="h-3 w-3" />
                  </button>
                  <button onClick={() => handleDelete(msg.id)} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="删除">
                    <Trash2 className="h-3 w-3" />
                  </button>
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
  } catch (e) { console.error('[component] error:', e); return ''; }
}
