'use client';

import Link from 'next/link';
import { parseInlineRefs } from '@/lib/utils';
import HashtagLink from './HashtagLink';

export default function InlineRefs({ text, className = '' }: { text: string; className?: string }) {
  const parts = parseInlineRefs(text);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === 'mention') {
          return (
            <Link
              key={i}
              href={`/profile/${part.value}`}
              className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
            >
              @{part.value}
            </Link>
          );
        }
        if (part.type === 'hashtag') {
          return <HashtagLink key={i} tag={part.value} />;
        }
        return <span key={i}>{part.value}</span>;
      })}
    </span>
  );
}
