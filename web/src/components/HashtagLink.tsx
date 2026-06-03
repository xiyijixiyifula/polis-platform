'use client';

import Link from 'next/link';

export default function HashtagLink({ tag, className = '' }: { tag: string; className?: string }) {
  const clean = tag.replace(/^#/, '');
  return (
    <Link
      href={`/hashtag/${encodeURIComponent(clean)}`}
      className={`text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-medium ${className}`}
    >
      #{clean}
    </Link>
  );
}
