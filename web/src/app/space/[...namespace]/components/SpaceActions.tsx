'use client';

import React from 'react';
import { Star } from 'lucide-react';

interface SpaceActionsProps {
	isOwner: boolean;
	isMember: boolean;
	isFollowing: boolean;
	isStarred: boolean;
	joinStatus: string;
	joining: boolean;
	followLoading: boolean;
	starLoading: boolean;
	showJoinInput: boolean;
	joinMessage: string;
	setJoinMessage: (v: string) => void;
	setShowJoinInput: (v: boolean) => void;
	onJoin: () => void;
	onFollow: () => void;
	onStar: () => void;
	visibility?: string;
}

export default function SpaceActions({
	isOwner, isMember, isFollowing, isStarred, joinStatus,
	joining, followLoading, starLoading,
	showJoinInput, joinMessage, setJoinMessage, setShowJoinInput,
	onJoin, onFollow, onStar, visibility,
}: SpaceActionsProps) {
	return (
		<div className="flex items-center gap-2 shrink-0">
			<div className="flex flex-col items-end gap-1">
				<button
					className={`text-sm px-5 py-2 rounded-lg transition-colors ${
						isOwner || isMember
							? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-default'
							: joinStatus === 'pending'
							? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 cursor-default'
							: 'btn-primary'
					}`}
					disabled={isOwner || isMember || joining || joinStatus === 'pending'}
					onClick={onJoin}
				>
					{isOwner ? '我的社区' : isMember ? '✓ 已加入' : joinStatus === 'pending' ? '审批中...' : joining ? '加入中...' : '加入社区'}
				</button>
				{!isOwner && (
					<button
						className={`text-sm px-4 py-2 rounded-lg transition-colors ${
							isFollowing
								? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
								: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40'
						}`}
						disabled={followLoading}
						onClick={onFollow}
					>
						{isFollowing ? '已关注' : followLoading ? '...' : '关注'}
					</button>
				)}
				{!isOwner && (
					<button
						className={`text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-1 ${
							isStarred
								? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700'
								: 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:text-yellow-600 dark:hover:text-yellow-400'
						}`}
						disabled={starLoading}
						onClick={onStar}
					>
						<Star className={`w-4 h-4 ${isStarred ? 'fill-yellow-500' : ''}`} />
						{isStarred ? '已收藏' : starLoading ? '...' : '收藏'}
					</button>
				)}
				{!isOwner && !isMember && showJoinInput && (
					<div className="flex items-center gap-1">
						<input
							type="text"
							value={joinMessage}
							onChange={e => setJoinMessage(e.target.value)}
							placeholder="申请留言（选填）"
							className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-36"
						/>
						<button
							onClick={() => setShowJoinInput(false)}
							className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
						>
							取消
						</button>
					</div>
				)}
				{!isOwner && !isMember && !showJoinInput && visibility === 'private' && (
					<button
						onClick={() => setShowJoinInput(true)}
						className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
					>
						附言申请
					</button>
				)}
			</div>
		</div>
	);
}
