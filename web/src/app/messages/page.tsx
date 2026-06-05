'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MessageSquare, User, Trash2, BellOff, Search, X, Users, MessageCircle, CheckSquare, Square, Compass } from 'lucide-react';
import { messages, contacts, getToken, type ConversationSummary } from '@/lib/api';

type Contact = { id: string; username: string; display_name: string; is_mutual: boolean };

export default function MessagesPage() {
  const [tab, setTab] = useState<'chats' | 'contacts'>('chats');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [contactList, setContactList] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    setIsLoggedIn(true);
    loadConversations();
  }, []);

  useEffect(() => {
    if (tab === 'contacts' && isLoggedIn) loadContacts();
  }, [tab, isLoggedIn]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const res = await messages.getConversations();
      if (res.code === 0 && Array.isArray(res.data)) {
        setConversations(res.data);
      }
    } catch (e: any) { setError(e.message || '加载失败'); }
    setLoading(false);
  };

  const loadContacts = async () => {
    setContactsLoading(true);
    try {
      const res = await contacts.getMutual();
      if (res.code === 0 && Array.isArray(res.data)) {
        setContactList(res.data);
      }
    } catch (e: any) { console.error('[messages] loadContacts error:', e); setError(e.message || '加载联系人失败'); }
    setContactsLoading(false);
  };

  const toggleSelect = (userId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === conversations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(conversations.map(c => c.other_user.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0 || batchDeleting) return;
    if (!confirm(`确定要删除 ${selectedIds.size} 条对话吗？删除后聊天记录将被清除。`)) return;
    setBatchDeleting(true);
    try {
      const res = await messages.batchDelete(Array.from(selectedIds));
      if (res.code === 0) {
        setConversations(prev => prev.filter(c => !selectedIds.has(c.other_user.id)));
        setSelectedIds(new Set());
      }
    } catch (e: any) { console.error('[messages] handleBatchDelete error:', e); setError(e.message || '批量删除失败'); }
    setBatchDeleting(false);
  };

  const handleDelete = async (userId: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('确定要删除这条对话吗？')) return;
    try {
      const res = await messages.deleteConversation(userId);
      if (res.code === 0) setConversations(prev => prev.filter(c => c.other_user.id !== userId));
    } catch (e: any) { console.error('[messages] handleDelete error:', e); setError(e.message || '删除失败'); }
  };
  const handleMute = async (userId: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try {
      await messages.muteConversation(userId);
      loadConversations();
    } catch (e: any) { console.error('[messages] handleMute error:', e); setError(e.message || '免打扰设置失败'); }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true); setSearchResults(null);
    try {
      const res = await messages.search(searchQuery.trim());
      if (res.code === 0 && Array.isArray(res.data)) setSearchResults(res.data);
    } catch (e: any) { console.error('[messages] handleSearch error:', e); setError(e.message || '搜索失败'); }
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
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">私信</h1>
      </div>

      {/* Tabs: 消息 | 联系人 */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        {([
          { key: 'chats' as const, label: '消息', icon: MessageCircle },
          { key: 'contacts' as const, label: '联系人', icon: Users },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            placeholder={tab === 'contacts' ? '搜索联系人...' : '搜索私信...'}
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
            <span className="text-sm text-gray-500 dark:text-gray-400">找到 {searchResults.length} 条消息</span>
            <button onClick={() => setSearchResults(null)} className="text-sm text-primary-600 hover:underline">返回列表</button>
          </div>
          <div className="space-y-1">
            {searchResults.map((msg: any) => (
              <Link key={msg.id} href={`/messages/${msg.sender_id}`}
                className="block p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <p className="text-sm text-gray-900 dark:text-white line-clamp-1">{msg.content}</p>
                <p className="text-xs text-gray-400 mt-1">{formatTime(msg.created_at)}</p>
              </Link>
            ))}
            {searchResults.length === 0 && <p className="text-sm text-center py-4 text-gray-400">未找到相关消息</p>}
          </div>
        </div>
      )}

      {/* ===== 消息 Tab ===== */}
      {tab === 'chats' && (
        <>
          {loading ? (
            <div className="text-center py-12 text-gray-400">加载中...</div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">{error}</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">暂无私信会话</p>
              <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">访问其他用户的个人主页，点击"发送私信"开始对话</p>
              <Link href="/explore" className="btn-primary text-sm mt-4 inline-flex items-center gap-1.5 px-5 py-2 rounded-full">
                <Compass className="h-3.5 w-3.5" /> 探索社区
              </Link>
            </div>
          ) : (
            <>
              {/* Batch action bar */}
              <div className="flex items-center justify-between px-1 mb-2">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  {selectedIds.size === conversations.length && conversations.length > 0
                    ? <CheckSquare className="h-4 w-4" />
                    : <Square className="h-4 w-4" />
                  }
                  {selectedIds.size === conversations.length ? '取消全选' : '全选'}
                </button>
                {selectedIds.size > 0 && (
                  <button
                    onClick={handleBatchDelete}
                    disabled={batchDeleting}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-500 text-white text-xs hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    删除({selectedIds.size})
                  </button>
                )}
              </div>
              <div className="space-y-0.5">
              {conversations.map((conv) => (
                <div key={conv.other_user.id} className="group relative flex items-center gap-2">
                  {/* Checkbox */}
                  <button
                    onClick={(e) => { e.preventDefault(); toggleSelect(conv.other_user.id); }}
                    className="shrink-0 p-1 text-gray-400 hover:text-primary-500 transition-colors"
                  >
                    {selectedIds.has(conv.other_user.id)
                      ? <CheckSquare className="h-5 w-5 text-primary-500" />
                      : <Square className="h-5 w-5" />
                    }
                  </button>
                  <Link href={`/messages/${conv.other_user.id}`}
                    className="flex-1 flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden">
                        {conv.other_user.avatar_url ? (
                          <Image src={conv.other_user.avatar_url!} alt="" width={48} height={48} className="w-full h-full object-cover" unoptimized />
                        ) : (
                          <span className="text-primary-500 font-bold text-lg">
                            {(conv.other_user.display_name || conv.other_user.username || '?').charAt(0)}
                          </span>
                        )}
                      </div>
                      {conv.unread_count > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-5 min-w-[20px] flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1.5 shadow-sm">
                          {conv.unread_count > 99 ? '99+' : conv.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-white text-sm">
                          {conv.other_user.display_name || conv.other_user.username}
                        </span>
                        <span className="text-xs text-gray-400">{formatTime(conv.last_message_at)}</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {conv.last_message || '暂无消息'}
                      </p>
                    </div>
                  </Link>
                  {/* Hover actions */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-white/95 dark:bg-gray-900/95 rounded-lg p-1 shadow-sm z-10">
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
          </>
        )}
        </>
      )}

      {/* ===== 联系人 Tab（微信式互关通讯录） ===== */}
      {tab === 'contacts' && (
        <>
          {contactsLoading ? (
            <div className="text-center py-12 text-gray-400">加载中...</div>
          ) : contactList.length === 0 ? (
            <div className="glass-card p-6 py-16 text-center">
              <Users className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">暂无联系人</p>
              <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                互相关注的用户会自动成为联系人
              </p>
              <Link href="/explore" className="mt-3 inline-block text-sm text-primary-600 dark:text-primary-400 hover:underline">
                去发现新朋友 →
              </Link>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="text-xs text-gray-400 dark:text-gray-500 px-2 py-1 mb-1">
                {contactList.length} 位联系人
              </div>
              {contactList.map((contact) => (
                <Link key={contact.id} href={`/messages/${contact.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                  <div className="w-12 h-12 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg">
                    {(contact.display_name || contact.username || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {contact.display_name || contact.username}
                      </span>
                      <span className="text-xs text-amber-500" title="互相关注">🤝</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">@{contact.username}</p>
                  </div>
                  <MessageCircle className="h-4 w-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </>
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
  } catch (e: any) { console.error('[messages] formatTime error:', e); return ''; }
}
