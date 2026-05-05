'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ChatMessage {
  id: string;
  username: string;
  display_name: string;
  avatar_letter: string;
  content: string;
  message_type: string;
  created_at: string;
}

export function SpaceChat({ namespace }: { namespace: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('token');

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat/spaces/${namespace}?limit=50`);
      const json = await res.json();
      if (json.code === 0 && Array.isArray(json.data)) {
        setMessages(json.data);
      }
    } catch {} 
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [namespace]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/chat/spaces/${namespace}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: input.trim() }),
      });
      const json = await res.json();
      if (json.code === 0) {
        setInput('');
        fetchMessages();
      } else {
        setError(json.message || '发送失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[420px]">
      <div ref={containerRef} className="flex-1 overflow-y-auto space-y-3 p-3">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            暂无消息，来发送第一条吧
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex gap-2.5">
              <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-medium">
                {msg.avatar_letter}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-xs text-gray-900 dark:text-gray-200">
                    {msg.display_name}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {formatDate(msg.created_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 break-words mt-0.5">
                  {msg.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {error && (
        <div className="px-3 pb-1">
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      {isLoggedIn ? (
        <div className="border-t border-gray-100 dark:border-gray-700 p-2 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-sm dark:text-white focus:border-primary-400 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="btn btn-primary text-xs px-3 py-1.5 disabled:opacity-50 flex items-center gap-1"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
      ) : (
        <div className="border-t border-gray-100 dark:border-gray-700 p-3 text-center">
          <p className="text-xs text-gray-400">
            <a href="/login" className="text-primary-600 hover:underline">登录</a> 后参与聊天
          </p>
        </div>
      )}
    </div>
  );
}
