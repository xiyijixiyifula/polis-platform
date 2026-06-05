'use client';

import React from 'react';
import Link from 'next/link';
import { SpaceAnalyticsMini } from '@/components/SpaceAnalytics';
import type { Space } from '@/lib/api';

interface SpaceSidebarProps {
	space: Space;
	displayNs: string;
	ownerName: string | null;
	availableTabs: { id: string; label: string; icon: string }[];
	isOwner: boolean;
	cleanNamespace: string;
}

export default function SpaceSidebar({ space, displayNs, ownerName, availableTabs, isOwner, cleanNamespace }: SpaceSidebarProps) {
	return (
		<aside className="w-72 shrink-0 hidden xl:block">
			<div className="sticky top-20 space-y-4">
				<div className="glass-card p-6">
					<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">关于社区</h3>
					<div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
						<div className="flex justify-between">
							<span>命名空间</span>
							<span className="text-gray-700 dark:text-gray-300 font-mono">/{displayNs}</span>
						</div>
						{ownerName && (
							<div className="flex justify-between">
								<span>创建者</span>
								<Link href={`/profile/${ownerName}`} className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
									@{ownerName}
								</Link>
							</div>
						)}
						<div className="flex justify-between">
							<span>可见性</span>
							<span className="text-gray-700 dark:text-gray-300">
								{{'public':'公开','private':'私有','unlisted':'不公开'}[space.visibility] || space.visibility}
							</span>
						</div>
						<div className="flex justify-between">
							<span>状态</span>
							<span className="text-green-600 dark:text-green-400">活跃</span>
						</div>
						<div className="flex justify-between">
							<span>启用模块</span>
							<span className="text-gray-700 dark:text-gray-300">
								{availableTabs.map(t => t.label).join(' · ')}
							</span>
						</div>
					</div>
				</div>

				{isOwner && (
					<SpaceAnalyticsMini namespace={cleanNamespace} />
				)}
			</div>
		</aside>
	);
}
