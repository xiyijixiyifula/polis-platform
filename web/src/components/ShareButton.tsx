'use client';

import { Share2, Check, Copy, Link2, Twitter, MessageCircle } from 'lucide-react';
import { useState } from 'react';

export function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const fullUrl = `https://polis.app${url}`;
  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);

  const copyLink = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowMenu(false);
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title, url: fullUrl }).catch(() => {});
    } else {
      setShowMenu(!showMenu);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={share}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary-600 transition-colors"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Share2 className="h-3.5 w-3.5" />}
        {copied ? '已复制' : '分享'}
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg py-1 z-50"
          onMouseLeave={() => setShowMenu(false)}>
          <button
            onClick={copyLink}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Copy className="h-4 w-4" />
            复制链接
          </button>
          <a
            href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setShowMenu(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Twitter className="h-4 w-4" />
            Twitter/X
          </a>
          <a
            href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setShowMenu(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <MessageCircle className="h-4 w-4" />
            Telegram
          </a>
          <a
            href={`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setShowMenu(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Link2 className="h-4 w-4" />
            WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
