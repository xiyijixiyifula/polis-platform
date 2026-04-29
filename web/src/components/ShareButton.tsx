'use client';

import { Share2, Check } from 'lucide-react';
import { useState } from 'react';

export function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const fullUrl = `https://polis.app${url}`;

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title, url: fullUrl }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button onClick={share} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary-600 transition-colors">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? '已复制' : '分享'}
    </button>
  );
}
