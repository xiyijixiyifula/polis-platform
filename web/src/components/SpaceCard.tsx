'use client';

import Link from 'next/link';
import { Users, FileText } from 'lucide-react';
import { formatCount } from '@/lib/utils';

interface SpaceCardProps {
  space: {
    id: string;
    namespace: string;
    title: string;
    description: string;
    icon_url: string | null;
    member_count: number;
    post_count: number;
    is_root?: boolean;
    owner_id?: string | null;
    owner_name?: string;
  };
}

export function SpaceCard({ space }: SpaceCardProps) {
  // Parse GitHub-style namespace: "username/community" -> owner + name
  const nsParts = space.namespace.split('/');
  const hasOwner = nsParts.length >= 2;
  const ownerName = space.owner_name || (hasOwner ? nsParts[0] : null);
  const communitySlug = hasOwner ? nsParts[nsParts.length - 1] : nsParts[0];

  return (
    <Link href={`/space/${space.namespace}`}>
      <div className="card group cursor-pointer transition-all hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-lg">
            {space.icon_url ? (
              <img src={space.icon_url} alt="" className="h-full w-full rounded-xl object-cover" />
            ) : (
              space.title.charAt(0)
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                {space.title}
              </h3>
              {space.is_root && (
                <span className="shrink-0 rounded bg-primary-100 dark:bg-primary-900/30 px-1.5 py-0.5 text-[10px] font-medium text-primary-700 dark:text-primary-400">
                  根社区
                </span>
              )}
            </div>
            {/* GitHub-style namespace display */}
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
              {ownerName ? (
                <span>
                  <span className="text-primary-600 dark:text-primary-400">@{ownerName}</span>
                  <span className="text-gray-300 dark:text-gray-600">/</span>
                  <span className="text-gray-700 dark:text-gray-300 font-mono">{communitySlug}</span>
                </span>
              ) : (
                <span className="font-mono text-gray-500">/{space.namespace}</span>
              )}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{space.description}</p>
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {formatCount(space.member_count)} 成员
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {formatCount(space.post_count)} 帖子
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
