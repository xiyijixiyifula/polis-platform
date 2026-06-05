'use client';

import React from 'react';

interface SpaceTabsProps {
	tabs: { id: string; label: string; icon: string }[];
	activeTab: string;
	onTabChange: (tabId: string) => void;
}

export default function SpaceTabs({ tabs, activeTab, onTabChange }: SpaceTabsProps) {
	return (
		<div className="mb-4 flex items-center border-b border-gray-200 dark:border-gray-700 gap-0.5">
			<div className="flex-1 flex items-center gap-0.5 overflow-x-auto">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						onClick={() => onTabChange(tab.id)}
						className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
							activeTab === tab.id
								? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
								: 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
						}`}
					>
						<span className="text-base">{tab.icon}</span>
						{tab.label}
					</button>
				))}
			</div>
		</div>
	);
}
