'use client';

import React from 'react';
import { Megaphone } from 'lucide-react';

interface Announcement {
	id: string; title: string; body: string;
	importance: string; is_pinned: boolean;
	created_at: string;
}

interface AnnouncementsBannerProps {
	announcements: Announcement[];
}

export default function AnnouncementsBanner({ announcements }: AnnouncementsBannerProps) {
	const urgentImportant = announcements.filter(a => a.importance === 'urgent' || a.importance === 'important');

	if (urgentImportant.length === 0) return null;

	return (
		<div className="mb-4 space-y-2">
			{urgentImportant.map(ann => (
				<div key={ann.id} className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${
					ann.importance === 'urgent'
						? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
						: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
				}`}>
					<Megaphone className={`h-5 w-5 mt-0.5 shrink-0 ${
						ann.importance === 'urgent' ? 'text-red-500' : 'text-amber-500'
					}`} />
					<div>
						<p className={`text-sm font-medium ${
							ann.importance === 'urgent' ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'
						}`}>{ann.title}</p>
						<p className={`text-xs mt-0.5 ${
							ann.importance === 'urgent' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
						}`}>{ann.body}</p>
					</div>
				</div>
			))}
		</div>
	);
}
