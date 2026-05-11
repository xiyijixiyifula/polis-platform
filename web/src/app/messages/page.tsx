'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, User, Trash2, BellOff, Search, X } from 'lucide-react';
import { messages, type ConversationSummary } from '@/lib/api';

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('polis_access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    setIsLoggedIn(true);
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const res = await messages.getConversations();
      if (res.code === 0 && Array.isArray(res.data)) {
        setConversations(res.data);
      }
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('确定要删除这条对话吗？')) return;
    try {
      const res = await messages.deleteConversation(userId);
      if (res.code === 0) {
        setConversations(prev => prev.filter(c => c.other_user.id !== userId));
      }
    } catch {}
  };

  const handleMute = async (userId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await messages.muteConversation(userId);
      if (res.code === 0) {
        loadConversations();
      }
    } catch {}
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults(null);
    try {
      const res = await messages.search(searchQuery.trim());
      if (res.code === 0 && Array.isArray(res.data)) {
        setSearchResults(res.data);
      }
    } catch {}
    setSearching(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <MessageSquare className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">请先登录以查看私信</p>
        <Link href="/login" className="mt-4 inline-block btn-primary px-6 py-2">登录</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">私信</h1>
      </div>

      {/* Search bar */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="搜索私信..."
            className="w-full pl-10 pr-8 py-2 rounded-full bg-gray-100 dark:bg-gray-800 border-0 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button onClick={handleSearch} disabled={searching || !searchQuery.trim()} className="px-3 py-2 rounded-full bg-primary-500 text-white text-sm hover:bg-primary-600 disabled:opacity-50 transition-colors">
          {searching ? '...' : '搜索'}
        </button>
      </div>

      {/* Search Results */}
      {searchResults !== null && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              找到 {searchResults.length} 条消息
            </span>
            <button onClick={() => setSearchResults(null)} className="text-sm text-primary-600 hover:underline">返回列表</button>
          </div>
          <div className="space-y-1">
            {searchResults.map((msg: any) => (
              <Link
                key={msg.id}
                href={`/messages/${msg.sender_id}`}
                className="block p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <p className="text-sm text-gray-900 dark:text-white line-clamp-1">{msg.content}</p>
                <p className="text-xs text-gray-400 mt-1">{formatTime(msg.created_at)}</p>
              </Link>
            ))}
            {searchResults.length === 0 && (
              <p className="text-sm text-center py-4 text-gray-400">未找到相关消息</p>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">暂无私信会话</p>
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">访问其他用户的个人主页，点击"发送私信"开始对话</p>
        </div>
      ) : (
        <div className="space-y-1">
          {conversations.map((conv) => (
            <div key={conv.other_user.id} className="group relative">
              <Link
                href={`/messages/${conv.other_user.id}`}
                className="flex items-start gap-3 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden">
                  {conv.other_user.avatar_url ? (
                    <img src={conv.other_user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-primary-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white text-sm">
                      {conv.other_user.display_name || conv.other_user.username}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {conv.last_message}
                  </p>
                </div>
                {conv.unread_count > 0 && (
                  <span className="flex-shrink-0 h-5 min-w-[20px] flex items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white px-1.5">
                    {conv.unread_count > 99 ? '99+' : conv.unread_count}
                  </span>
                )}
              </Link>
              {/* Action buttons on hover */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-white/90 dark:bg-gray-900/90 rounded-lg p-1 shadow-sm">
                <button onClick={(e) => handleMute(conv.other_user.id, e)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-orange-500 transition-colors" title="免打扰">
                  <BellOff className="h-3.5 w-3.5" />
                </button>
                <button onClick={(e) => handleDelete(conv.other_user.id, e)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors" title="删除">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}
