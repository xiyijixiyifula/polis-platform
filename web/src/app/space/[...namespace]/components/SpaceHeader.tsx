'use client';

import React from 'react';
import Link from 'next/link';
import { Users, Star, Megaphone, Pencil, Trash2, ImageIcon } from 'lucide-react';
import { formatCount } from '@/lib/utils';
import { SpaceParticles } from '@/components/SpaceParticles';
import type { Space } from '@/lib/api';

interface Announcement {
	id: string; title: string; body: string;
	importance: string; is_pinned: boolean;
	created_at: string;
}

interface SpaceHeaderProps {
	space: Space;
	cleanNamespace: string;
	isOwner: boolean;
	isMember: boolean;
	ownerName: string | null;
	ownerSegment: string | null;
	communityName: string;
	announcements: Announcement[];
	// Edit dialog state + actions
	showEditDialog: boolean;
	setShowEditDialog: (v: boolean) => void;
	editForm: { title: string; description: string; icon_url: string; banner_url: string };
	setEditForm: React.Dispatch<React.SetStateAction<{ title: string; description: string; icon_url: string; banner_url: string }>>;
	editSaving: boolean;
	uploadingIcon: boolean;
	uploadingBanner: boolean;
	onSaveEdit: () => void;
	onDeleteSpace: () => void;
	onUploadIcon: (file: File) => void;
	onUploadBanner: (file: File) => void;
}

export default function SpaceHeader(props: SpaceHeaderProps) {
	const {
		space, cleanNamespace, isOwner, isMember, ownerName, ownerSegment,
		communityName, announcements,
		showEditDialog, setShowEditDialog, editForm, setEditForm,
		editSaving, uploadingIcon, uploadingBanner,
		onSaveEdit, onDeleteSpace, onUploadIcon, onUploadBanner,
	} = props;

	return (
		<>
			{/* Community Header - GitHub Style with Particles */}
			<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50 to-white dark:from-slate-900 dark:to-slate-800 mb-6">
				{space.banner_url && (
					<div className="h-32 w-full bg-cover bg-center" style={{ backgroundImage: `url(${space.banner_url})` }} />
				)}
				<div className="p-6">
					<SpaceParticles color="16, 185, 129" />
					<div className="relative z-10 flex items-start gap-4">
						<div className="h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl overflow-hidden">
							{space?.icon_url ? (
								<img src={space.icon_url} className="h-full w-full object-cover" alt="" loading="lazy" />
							) : (
								space?.title?.charAt(0) || '?'
							)}
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-3 flex-wrap">
								<h1 className="text-2xl font-bold text-gray-900 dark:text-white">{space.title}</h1>
								{space.level && space.level > 0 && (
									<span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
										space.level >= 5 ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' :
										space.level >= 4 ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
										space.level >= 3 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
										space.level >= 2 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
										'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
									}`}>
										Lv.{space.level}
									</span>
								)}
								{isOwner && (<>
									<button
										onClick={() => {
											setEditForm({ title: space.title, description: space.description || '', icon_url: space.icon_url || '', banner_url: space.banner_url || '' });
											setShowEditDialog(true);
										}}
										className="p-1 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
										title="编辑社区"
									>
										<Pencil className="h-4 w-4" />
									</button>
									<button
										onClick={onDeleteSpace}
										className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
										title="删除社区"
									>
										<Trash2 className="h-4 w-4" />
									</button>
									<Link
										href={`/space/manage/${cleanNamespace}`}
										className="px-3 py-1 text-sm rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
									>
										管理
									</Link>
								</>)}
							</div>
							{/* GitHub-style namespace breadcrumb */}
							<div className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
								{ownerSegment || ownerName ? (
									<>
										<Link
											href={`/profile/${ownerSegment || ownerName}`}
											className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
										>
											@{ownerSegment || ownerName}
										</Link>
										<span className="text-gray-300 dark:text-gray-600">/</span>
									</>
								) : null}
								<span className="font-mono text-gray-700 dark:text-gray-300">{communityName}</span>
							</div>
							<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{space.description}</p>
							<div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
								<span className="flex items-center gap-1"><Users className="h-4 w-4" /> {formatCount(space.member_count)} 成员</span>
								<span>{formatCount(space.post_count)} 帖子</span>
								<span>{formatCount(space.follower_count || 0)} 关注</span>
								<span className="flex items-center gap-1"><Star className="h-4 w-4" /> {formatCount(space.star_count || 0)} 收藏</span>
								{announcements.length > 0 && (
									<span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
										<Megaphone className="h-4 w-4" /> {announcements.length} 条公告
									</span>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Edit Community Dialog */}
			{showEditDialog && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowEditDialog(false)}>
					<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
						<h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">编辑社区</h3>
						<div className="space-y-3">
							<div>
								<label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">名称</label>
								<input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })}
									className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">描述</label>
								<textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
									rows={3}
									className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
							</div>
							<div>
								<label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">图标</label>
								<div className="flex items-center gap-3">
									{editForm.icon_url ? (
										<img src={editForm.icon_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700" loading="lazy" />
									) : (
										<div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
											<ImageIcon className="h-5 w-5" />
										</div>
									)}
									<label className="flex-1">
										<input type="file" accept="image/*" className="hidden" disabled={uploadingIcon}
											onChange={async (e) => {
												const file = e.target.files?.[0];
												if (!file) return;
												onUploadIcon(file);
											}}
										/>
										<span className="px-3 py-2 text-sm border border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary-400 text-gray-500 hover:text-primary-600 transition-colors block text-center">
											{uploadingIcon ? '上传中...' : editForm.icon_url ? '更换图标' : '选择图标'}
										</span>
									</label>
									{editForm.icon_url && (
										<button type="button" className="text-xs text-red-400 hover:text-red-600" onClick={() => setEditForm(prev => ({ ...prev, icon_url: '' }))}>移除</button>
									)}
								</div>
							</div>
							<div>
								<label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">封面</label>
								<div className="space-y-2">
									{editForm.banner_url && (
										<img src={editForm.banner_url} alt="" className="w-full h-24 rounded-lg object-cover border border-gray-200 dark:border-gray-700" loading="lazy" />
									)}
									<label>
										<input type="file" accept="image/*" className="hidden" disabled={uploadingBanner}
											onChange={async (e) => {
												const file = e.target.files?.[0];
												if (!file) return;
												onUploadBanner(file);
											}}
										/>
										<span className="px-3 py-2 text-sm border border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary-400 text-gray-500 hover:text-primary-600 transition-colors block text-center">
											{uploadingBanner ? '上传中...' : editForm.banner_url ? '更换封面' : '选择封面 (推荐 1200×400)'}
										</span>
									</label>
									{editForm.banner_url && (
										<button type="button" className="text-xs text-red-400 hover:text-red-600" onClick={() => setEditForm(prev => ({ ...prev, banner_url: '' }))}>移除封面</button>
									)}
								</div>
							</div>
						</div>
						<div className="flex items-center justify-end gap-2 mt-4">
							<button onClick={() => setShowEditDialog(false)}
								className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">取消</button>
							<button onClick={onSaveEdit}
								disabled={editSaving}
								className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
								{editSaving ? '保存中...' : '保存'}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
