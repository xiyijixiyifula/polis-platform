'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PostCard } from '@/components/PostCard';
import { PollCard } from '@/components/PollCard';
import { SeriesCard } from '@/components/SeriesCard';
import GameCard from '@/components/GameCard';
import SpaceCodeRepo from '@/components/SpaceCodeRepo';
import SpaceStore from '@/components/SpaceStore';
import { Users, Share2, MessageCircle, Plus, PenLine, UserCheck, BarChart3, Megaphone, Vote, Layout, Pin, Video, HelpCircle, MessageSquare, BookOpen, Crown, Library, BookText, Gamepad2, AppWindow, Grid3X3, List } from 'lucide-react';
import NovelCard, { adaptPostToNovel } from '@/components/NovelCard';
import QACard from '@/components/QACard';
import { Pencil, Trash2 } from 'lucide-react';
import { getModuleEmoji, buildPostLink } from '@/lib/module-config';
import { GraduationCap } from 'lucide-react';
import type { Space, Post, Series, SpaceTier, Subscription } from '@/lib/api';
import { SpaceAnalytics } from '@/components/SpaceAnalytics';
import { SpaceChat } from '@/components/SpaceChat';
import { SpaceVideoTab } from '@/components/SpaceVideoTab';
import { JoinRequestsPanel } from '@/components/JoinRequestsPanel';
import { MemberActions } from '@/components/MemberActions';
import type { Member } from '../hooks/useSpaceData';

interface Announcement {
	id: string; title: string; body: string;
	importance: string; is_pinned: boolean; created_at: string;
}

interface TabRendererProps {
	// Data
	space: Space;
	cleanNamespace: string;
	posts: Post[];
	announcements: Announcement[];
	polls: any[];
	overviewVideos: any[];
	featured: Post[];
	seriesList: Series[];
	members: Member[];
	spaceTiers: SpaceTier[];
	mySubscription: Subscription | null;
	spaceModules: any[];
	moduleKeySet: Set<string>;
	activeTab: string;
	isOwner: boolean;
	isMember: boolean;
	// Loading
	postLoading: boolean;
	seriesLoading: boolean;
	membersLoading: boolean;
	tiersLoading: boolean;
	loadingMore: boolean;
	postPage: number;
	postTotalPages: number;
	postSort: string;
	showHiddenPosts: boolean;
	setPostSort: (v: string) => void;
	setShowHiddenPosts: (v: boolean) => void;
	// Actions
	togglePin: (postId: string, isPinned: boolean) => void;
	toggleHide: (postId: string) => void;
	toggleUnhide: (postId: string) => void;
	toggleFeature: (postId: string, isFeatured: boolean) => void;
	loadMorePosts: () => void;
	goToPostPage: (p: number) => void;
	// Series
	showCreateSeries: boolean;
	setShowCreateSeries: (v: boolean) => void;
	newSeriesTitle: string;
	setNewSeriesTitle: (v: string) => void;
	newSeriesDesc: string;
	setNewSeriesDesc: (v: string) => void;
	seriesCreating: boolean;
	handleCreateSeries: () => void;
	// Tiers
	showTierForm: boolean;
	setShowTierForm: (v: boolean) => void;
	editingTier: any;
	setEditingTier: (v: any) => void;
	tierForm: { name: string; price_cents: string; description: string; benefits: string };
	setTierForm: (v: any) => void;
	tierSaving: boolean;
	subscribing: string | null;
	handleSaveTier: () => void;
	handleDeleteTier: (tierId: string, tierName: string) => void;
	handleSubscribe: (tierId: string, isMyTier: boolean) => void;
	// Members
	refreshMembers: () => void;
}

export default function TabRenderer(props: TabRendererProps) {
	const {
		space, cleanNamespace, posts, announcements, polls, overviewVideos, featured,
		seriesList, members, spaceTiers, mySubscription, spaceModules, moduleKeySet,
		activeTab, isOwner, isMember,
		postLoading, seriesLoading, membersLoading, tiersLoading,
		loadingMore, postPage, postTotalPages, postSort, showHiddenPosts,
		setPostSort, setShowHiddenPosts,
		togglePin, toggleHide, toggleUnhide, toggleFeature,
		loadMorePosts, goToPostPage,
		showCreateSeries, setShowCreateSeries, newSeriesTitle, setNewSeriesTitle,
		newSeriesDesc, setNewSeriesDesc, seriesCreating, handleCreateSeries,
		showTierForm, setShowTierForm, editingTier, setEditingTier,
		tierForm, setTierForm, tierSaving, subscribing,
		handleSaveTier, handleDeleteTier, handleSubscribe,
		refreshMembers,
	} = props;

	return (
		<>
			{/* === Overview Tab === */}
			{activeTab === 'overview' && (
				<div className="space-y-5">
					{space.description && (
						<div className="glass-card p-6">
							<div className="flex items-center gap-2 mb-3">
								<Layout className="h-4 w-4 text-gray-400" />
								<h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">关于</h3>
							</div>
							<div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
								{space.description}
							</div>
							<div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
								<span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {space.member_count}</span>
								<span>·</span>
								<span>{space.post_count} 帖子</span>
								<span>·</span>
								<span>{polls.length} 投票</span>
								<span>·</span>
								<span>{overviewVideos.length} 视频</span>
								<span>·</span>
								<span>{announcements.length} 公告</span>
								<span>·</span>
								<span className="capitalize">{{public:'公开', private:'私有', unlisted:'不公开'}[space.visibility]}</span>
							</div>
						</div>
					)}

					{featured.length > 0 && (
						<div>
							<div className="flex items-center gap-2 mb-3">
								<Pin className="h-4 w-4 text-amber-500" />
								<h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">精选内容</h3>
							</div>
							<div className="space-y-2">
								{featured.slice(0, 4).map((post) => (
									<Link key={post.id} href={buildPostLink(post.id, cleanNamespace)}
										className="glass-card block hover:border-primary-400 dark:hover:border-primary-600 transition-colors group py-3 px-4">
										<div className="flex items-center gap-2">
											<Pin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
											<h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 truncate">
												{post.title}
											</h4>
										</div>
										<p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-1 ml-6">
											{post.body?.replace(/<[^>]+>/g, '').slice(0, 150)}
										</p>
									</Link>
								))}
							</div>
						</div>
					)}

					{/* Community feed */}
					<div>
						<div className="flex items-center gap-2 mb-3">
							<MessageCircle className="h-4 w-4 text-gray-400" />
							<h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">社区动态</h3>
						</div>
						{postLoading ? (
							<div className="glass-card py-6 text-center text-gray-400 animate-pulse">加载中...</div>
						) : posts.length > 0 ? (
							<div className="space-y-1">
								{posts.slice(0, 20).map((post) => {
									const moduleIcon = getModuleEmoji(post.module_type);
									const moduleLabel = spaceModules.find(m => m.module_key === post.module_type)?.name || post.module_type || '交流';
									const author = (post.author || {}) as any;
									const authorUsername = author.username || '';
									const bodyPreview = post.body?.replace(/<[^>]+>/g, '').slice(0, 120) || '';
									return (
										<Link key={post.id} href={`/post/${post.id}?space=${encodeURIComponent(cleanNamespace)}`}
											className="block px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors rounded-lg border-b border-gray-100 dark:border-gray-800 last:border-0">
											<div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-0.5 flex-wrap">
												<span>{moduleIcon}</span>
												<span className="font-medium text-primary-600 dark:text-primary-400">{moduleLabel}</span>
												<span className="text-gray-300 dark:text-gray-600">/</span>
												<span className="text-gray-900 dark:text-white font-semibold truncate">
													{post.title || '无标题'}
												</span>
											</div>
											{bodyPreview && (
												<p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-1.5 ml-5">
													{bodyPreview}
												</p>
											)}
											<div className="flex items-center gap-3 ml-5 text-xs text-gray-400">
												<Link href={`/profile/${authorUsername}`} onClick={e => e.stopPropagation()} className="hover:text-primary-600 dark:hover:text-primary-400">
													@{authorUsername}
												</Link>
												<span>·</span>
												<span>{new Date(post.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
												<span className="flex items-center gap-1">👍 {post.like_count || 0}</span>
												<span className="flex items-center gap-1">💬 {post.comment_count || 0}</span>
												<span className="flex items-center gap-1">👁 {post.view_count || 0}</span>
											</div>
										</Link>
									);
								})}
							</div>
						) : (
							<div className="glass-card py-8 text-center text-gray-400 dark:text-gray-500">
								<PenLine className="h-8 w-8 mx-auto mb-2 opacity-30" />
								<p className="text-sm">还没有内容</p>
								<Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}`} className="text-xs text-primary-600 dark:text-primary-400 hover:underline mt-1 inline-block">
									发布第一篇帖子
								</Link>
							</div>
						)}
					</div>

					{overviewVideos.length > 0 && (
						<div>
							<div className="flex items-center gap-2 mb-3">
								<Video className="h-4 w-4 text-gray-400" />
								<h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">最新视频</h3>
								<Link href={`/space/${encodeURIComponent(cleanNamespace)}/video`} className="ml-auto text-xs text-primary-600 dark:text-primary-400 hover:underline">
									查看全部 →
								</Link>
							</div>
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
								{overviewVideos.slice(0, 6).map((v: any) => (
									<Link key={v.id} href={`/video/${v.id}?space=${encodeURIComponent(cleanNamespace)}`}
										className="group block">
										<div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
											{v.thumbnail_url ? (
												<Image src={v.thumbnail_url!} alt={v.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
											) : (
												<div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
													<Video className="h-8 w-8 text-gray-400" />
												</div>
											)}
											<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
												<div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
													<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
												</div>
											</div>
											{v.duration_seconds && (
												<div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-xs">
													{Math.floor(v.duration_seconds / 60)}:{String(v.duration_seconds % 60).padStart(2, '0')}
												</div>
											)}
										</div>
										<h3 className="mt-1.5 text-xs font-medium text-gray-900 dark:text-white line-clamp-2 leading-tight">{v.title}</h3>
										<span className="text-xs text-gray-400">{v.view_count || 0} 次播放</span>
									</Link>
								))}
							</div>
						</div>
					)}
				</div>
			)}

			{/* === Series Tab === */}
			{activeTab === 'series' && (
				<>
					<div className="mb-4">
						{!showCreateSeries ? (
							<button
								onClick={() => setShowCreateSeries(true)}
								className="glass-card flex items-center gap-3 hover:border-primary-400 dark:hover:border-primary-600 transition-colors group w-full text-left"
							>
								<div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white font-medium text-sm group-hover:scale-105 transition-transform">
									<BookOpen className="h-5 w-5" />
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium text-gray-900 dark:text-white">创建系列</p>
									<p className="text-xs text-gray-400 dark:text-gray-500">将文章组织成系列/专栏合集</p>
								</div>
								<div className="btn-primary text-xs px-4 py-1.5 gap-1">
									<Plus className="h-3.5 w-3.5" /> 新建
								</div>
							</button>
						) : (
							<div className="glass-card p-6">
								<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">创建新系列</h3>
								<input
									type="text"
									placeholder="系列标题（如：游戏开发入门）"
									value={newSeriesTitle}
									onChange={e => setNewSeriesTitle(e.target.value)}
									className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-2"
								/>
								<textarea
									placeholder="系列简介（可选）"
									value={newSeriesDesc}
									onChange={e => setNewSeriesDesc(e.target.value)}
									rows={2}
									className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-3"
								/>
								<div className="flex items-center gap-2">
									<button onClick={handleCreateSeries} disabled={seriesCreating} className="btn-primary text-xs px-4 py-1.5">
										{seriesCreating ? '创建中...' : '创建系列'}
									</button>
									<button onClick={() => { setShowCreateSeries(false); setNewSeriesTitle(''); setNewSeriesDesc(''); }}
										className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-1.5">
										取消
									</button>
								</div>
							</div>
						)}
					</div>

					{seriesLoading ? (
						<div className="glass-card py-8 text-center text-gray-400 animate-pulse">加载系列...</div>
					) : seriesList.length > 0 ? (
						<div className="space-y-3">
							{seriesList.map((s) => (
								<SeriesCard key={s.id} series={s} namespace={cleanNamespace} />
							))}
						</div>
					) : (
						<div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500">
							<BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
							<p>暂无系列</p>
							<p className="text-sm mt-1">创建系列来组织你的文章合集</p>
						</div>
					)}
				</>
			)}

			{/* === Membership Tab === */}
			{activeTab === 'membership' && (
				<>
					<div className="mb-4">
						<div className="glass-card p-6">
							<div className="flex items-center gap-2 mb-3">
								<Crown className="h-4 w-4 text-amber-500" />
								<h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">会员等级</h3>
								{isOwner && (
									<button onClick={() => { setShowTierForm(!showTierForm); setEditingTier(null); setTierForm({ name: '', price_cents: '0', description: '', benefits: '' }); }} className="ml-auto text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
										<Plus className="h-3 w-3" />{showTierForm ? '收起' : '管理等级'}
									</button>
								)}
							</div>
							{isOwner && showTierForm && (
								<div className="mb-4 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50/30 dark:bg-primary-900/10 p-4">
									<h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{editingTier ? '编辑等级' : '创建等级'}</h4>
									<div className="space-y-2">
										<input type="text" placeholder="等级名称" value={tierForm.name}
											onChange={e => setTierForm({ ...tierForm, name: e.target.value })}
											className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
										<div className="flex gap-2">
											<input type="number" placeholder="价格（分）" value={tierForm.price_cents}
												onChange={e => setTierForm({ ...tierForm, price_cents: e.target.value })}
												className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
										</div>
										<textarea placeholder="等级描述（可选）" value={tierForm.description}
											onChange={e => setTierForm({ ...tierForm, description: e.target.value })}
											rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
										<input type="text" placeholder="权益（逗号分隔，如：全部文章,评论权限）" value={tierForm.benefits}
											onChange={e => setTierForm({ ...tierForm, benefits: e.target.value })}
											className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
										<div className="flex gap-2 pt-1">
											<button onClick={handleSaveTier} disabled={tierSaving} className="btn-primary text-xs px-4 py-2">
												{tierSaving ? '保存中...' : editingTier ? '更新' : '创建'}
											</button>
											<button onClick={() => { setShowTierForm(false); setEditingTier(null); }} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2">取消</button>
										</div>
									</div>
								</div>
							)}
							{mySubscription && (
								<div className="mb-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
									<p className="text-sm font-medium text-green-700 dark:text-green-400">你已是付费会员</p>
									<p className="text-xs text-green-600 dark:text-green-500 mt-1">订阅生效中</p>
								</div>
							)}
							{tiersLoading ? (
								<div className="text-center py-6 text-gray-400 animate-pulse">加载会员等级...</div>
							) : spaceTiers.length > 0 ? (
								<div className="space-y-3">
									{spaceTiers.map((tier: any) => {
										const benefits: string[] = Array.isArray(tier.benefits) ? tier.benefits : [];
										const isMyTier = mySubscription?.tier_id === tier.id;
										const price = (tier.price_cents / 100).toFixed(0);
										return (
											<div key={tier.id} className={'rounded-lg border p-4 ' + (isMyTier ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10' : 'border-gray-200 dark:border-gray-700')}>
												{isOwner && (<div className="flex gap-1 shrink-0 mb-3">
													<button onClick={(e) => { e.preventDefault(); e.stopPropagation();
														setEditingTier({ id: tier.id, name: tier.name, price_cents: tier.price_cents, description: tier.description, benefits: tier.benefits });
														setTierForm({ name: tier.name, price_cents: String(tier.price_cents), description: tier.description, benefits: Array.isArray(tier.benefits) ? tier.benefits.join(', ') : '' });
														setShowTierForm(true);
													}} title="编辑" className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20">
														<Pencil className="h-3.5 w-3.5" />
													</button>
													<button onClick={async (e) => { e.preventDefault(); e.stopPropagation();
														handleDeleteTier(tier.id, tier.name);
													}} title="删除" className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
														<Trash2 className="h-3.5 w-3.5" />
													</button>
												</div>)}
												<div className="flex items-start justify-between">
													<div className="flex-1">
														<div className="flex items-center gap-2">
															<h4 className="text-base font-bold text-gray-900 dark:text-white">{tier.name}</h4>
															{isMyTier && <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">当前订阅</span>}
														</div>
														{tier.description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{tier.description}</p>}
														<div className="mt-2"><span className="text-2xl font-bold text-gray-900 dark:text-white">{price}</span><span className="text-sm text-gray-500 dark:text-gray-400"> {tier.currency === 'CNY' ? '元' : tier.currency}/月</span></div>
														{benefits.length > 0 && (
															<ul className="mt-3 space-y-1">
																{benefits.map((b: string, i: number) => (<li key={i} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400"><span className="text-green-500">&#x2713;</span> {b}</li>))}
															</ul>
														)}
													</div>
													<button
														onClick={() => handleSubscribe(tier.id, isMyTier)}
														disabled={subscribing === tier.id}
														className={'shrink-0 ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ' + (isMyTier ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600' : 'bg-amber-500 hover:bg-amber-600 text-white')}
													>
														{subscribing === tier.id ? '处理中...' : isMyTier ? '取消订阅' : tier.price_cents > 0 ? '订阅' : '免费加入'}
													</button>
												</div>
											</div>
										);
									})}
								</div>
							) : (
								<div className="text-center py-8 text-gray-400 dark:text-gray-500">
									<Crown className="h-10 w-10 mx-auto mb-3 opacity-30" />
									<p>暂无会员等级</p>
									<p className="text-sm mt-1">社区尚未设置付费会员等级</p>
								</div>
							)}
						</div>
					</div>
				</>
			)}

			{/* === Wiki Tab === */}
			{activeTab === 'wiki' && (
				<>
					<Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}&module=wiki`}
						className="glass-card flex items-center gap-3 hover:border-primary-400 dark:hover:border-primary-600 transition-colors group mb-4">
						<div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-medium text-sm group-hover:scale-105 transition-transform">
							<Library className="h-5 w-5" />
						</div>
						<div className="flex-1">
							<p className="text-sm font-medium text-gray-900 dark:text-white">编写知识库页面</p>
							<p className="text-xs text-gray-400 dark:text-gray-500">支持 Markdown 语法，所有成员可编辑</p>
						</div>
						<div className="btn-primary text-xs px-4 py-1.5 gap-1">
							<Plus className="h-3.5 w-3.5" /> 创建
						</div>
					</Link>

					{postLoading ? (
						<div className="glass-card py-8 text-center text-gray-400 animate-pulse">加载中...</div>
					) : posts.filter(p => p.module_type === 'wiki').length > 0 ? (
						<div className="space-y-3">
							{posts.filter(p => p.module_type === 'wiki').map((post) => (
								<PostCard key={post.id} post={{
									id: post.id, title: post.title, body: post.body, author: post.author,
									space_id: post.space_id, space_ns: cleanNamespace, space_name: space.title,
									like_count: post.like_count, comment_count: post.comment_count, view_count: post.view_count,
									created_at: post.created_at, tags: post.tags, is_pinned: post.is_pinned,
									module_type: post.module_type,
								}} canHide={isOwner} onToggleHide={() => toggleHide(post.id)} isFeatured={post.is_featured} canFeature={isOwner && !post.is_hidden} onToggleFeature={() => toggleFeature(post.id, post.is_featured)} />
							))}
						</div>
					) : (
						<div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500">
							<Library className="h-10 w-10 mx-auto mb-3 opacity-30" />
							<p>暂无知识库页面</p>
							<p className="text-sm mt-1">创建第一篇知识库文档吧！</p>
						</div>
					)}
				</>
			)}

			{/* === Share Tab === */}
			{activeTab === 'share' && (
				<>
					{isOwner ? (
						<Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}&module=share`}
							className="glass-card flex items-center gap-3 hover:border-primary-400 dark:hover:border-primary-600 transition-colors group mb-4">
							<div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium text-sm group-hover:scale-105 transition-transform">
								<PenLine className="h-5 w-5" />
							</div>
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-900 dark:text-white">发布分享</p>
								<p className="text-xs text-gray-400 dark:text-gray-500">支持 Markdown 语法，仅创建者可发布</p>
							</div>
							<div className="btn-primary text-xs px-4 py-1.5 gap-1">
								<Plus className="h-3.5 w-3.5" /> 发布
							</div>
						</Link>
					) : (
						<div className="glass-card mb-4 py-4 px-4 text-center">
							<Share2 className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
							<p className="text-sm text-gray-500 dark:text-gray-400">此模块仅社区创建者可发布内容</p>
						</div>
					)}

					{postLoading ? (
						<div className="glass-card py-8 text-center text-gray-400 animate-pulse">加载帖子...</div>
					) : posts.filter(p => p.module_type === 'share').length > 0 ? (
						<div className="space-y-3">
							{posts.filter(p => p.module_type === 'share').map((post) => (
								<PostCard key={post.id} post={{
									id: post.id, title: post.title, body: post.body, author: post.author,
									space_id: post.space_id, space_ns: cleanNamespace, space_name: space.title,
									like_count: post.like_count, comment_count: post.comment_count, view_count: post.view_count,
									created_at: post.created_at, tags: post.tags, is_pinned: post.is_pinned,
									module_type: post.module_type,
								}} canHide={isOwner} onToggleHide={() => toggleHide(post.id)} isFeatured={post.is_featured} canFeature={isOwner && !post.is_hidden} onToggleFeature={() => toggleFeature(post.id, post.is_featured)} />
							))}
						</div>
					) : (
						<div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500">
							<Share2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
							<p>暂无分享内容</p>
							{isOwner && <p className="text-sm mt-1">发布你的第一篇分享吧！</p>}
						</div>
					)}
				</>
			)}

			{/* === Polls Tab === */}
			{activeTab === 'polls' && (
				<>
					<Link href={`/polls/new?space=${encodeURIComponent(cleanNamespace)}`}
						className="glass-card flex items-center gap-3 hover:border-primary-400 dark:hover:border-primary-600 transition-colors group mb-4">
						<div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-medium text-sm group-hover:scale-105 transition-transform">
							<Vote className="h-5 w-5" />
						</div>
						<div className="flex-1">
							<p className="text-sm font-medium text-gray-900 dark:text-white">发起投票</p>
							<p className="text-xs text-gray-400 dark:text-gray-500">创建单选/多选投票问卷</p>
						</div>
						<div className="btn-primary text-xs px-4 py-1.5 gap-1">
							<Plus className="h-3.5 w-3.5" /> 创建
						</div>
					</Link>

					{polls.length > 0 ? (
						<div className="space-y-3">
							{polls.map((poll) => (
								<PollCard key={poll.id} poll={poll} />
							))}
						</div>
					) : (
						<div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500">
							<BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
							<p>暂无投票</p>
							<p className="text-sm mt-1">发起第一个投票吧！</p>
						</div>
					)}
				</>
			)}

			{/* === Announcements Tab === */}
			{activeTab === 'announcements' && (
				<div className="space-y-3">
					{announcements.length > 0 ? (
						announcements.map(ann => (
							<div key={ann.id} className={`card ${
								ann.importance === 'urgent' ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10' :
								ann.importance === 'important' ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10' : ''
							}`}>
								<div className="flex items-center gap-2 mb-1">
									<Megaphone className={`h-4 w-4 ${
										ann.importance === 'urgent' ? 'text-red-500' :
										ann.importance === 'important' ? 'text-amber-500' : 'text-gray-400'
									}`} />
									<h3 className="font-medium text-gray-900 dark:text-white">{ann.title}</h3>
									{ann.importance !== 'normal' && (
										<span className={`text-xs px-1.5 py-0.5 rounded ${
											ann.importance === 'urgent' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
											'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
										}`}>
											{{'urgent':'紧急','important':'重要'}[ann.importance] || ann.importance}
										</span>
									)}
								</div>
								<p className="text-sm text-gray-600 dark:text-gray-400">{ann.body}</p>
							</div>
						))
					) : (
						<div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500">
							<Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
							<p>暂无公告</p>
						</div>
					)}
				</div>
			)}

			{/* === Members Tab === */}
			{activeTab === 'members' && (
				<>
					{isOwner && <JoinRequestsPanel namespace={cleanNamespace} />}

					{membersLoading ? (
						<div className="glass-card py-8 text-center text-gray-400 animate-pulse">加载中...</div>
					) : members.length > 0 ? (
						<div className="space-y-2">
							{members.map((m) => (
								<div
									key={m.user.id}
									className="glass-card flex items-center gap-3 hover:border-primary-400 dark:hover:border-primary-600 transition-colors group overflow-visible"
								>
									<Link href={`/profile/${m.user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
										<div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm">
											{(m.user.display_name || m.user.username).charAt(0).toUpperCase()}
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-1.5">
												<span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
													{m.user.display_name || m.user.username}
												</span>
												{m.user.verified && (
													<span className="text-blue-500 text-xs">✓</span>
												)}
											</div>
											<p className="text-xs text-gray-400 dark:text-gray-500">
												@{m.user.username}
											</p>
										</div>
									</Link>
									{isOwner && m.role !== 'owner' ? (
										<MemberActions
											namespace={cleanNamespace}
											userId={m.user.id}
											username={m.user.username}
											currentRole={m.role}
											onAction={refreshMembers}
										/>
									) : (
										<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
											m.role === 'owner' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' :
											m.role === 'moderator' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
											m.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
											'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
										}`}>
											{{'owner': '创建者', 'moderator': '管理员', 'admin': '管理员', 'member': '成员'}[m.role] || m.role}
										</span>
									)}
								</div>
							))}
						</div>
					) : (
						<div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500">
							<UserCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
							<p>暂无成员</p>
							<p className="text-sm mt-1">成为第一个加入的成员吧！</p>
						</div>
					)}
				</>
			)}

			{/* === Chat Tab === */}
			{activeTab === 'chat' && (
				<div className="glass-card overflow-hidden">
					<div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
						<MessageSquare className="h-4 w-4 text-primary-600" />
						<span className="font-medium text-sm text-gray-900 dark:text-white">社区聊天室</span>
					</div>
					<SpaceChat namespace={cleanNamespace} />
				</div>
			)}

			{/* === Video Tab === */}
			{activeTab === 'video' && (
				<SpaceVideoTab namespace={cleanNamespace} spaceId={space?.id || null} isOwner={isOwner} />
			)}

			{/* === Code Repo Tab === */}
			{activeTab === 'code_repo' && (
				<SpaceCodeRepo namespace={cleanNamespace} />
			)}

			{/* === QA Tab === */}
			{activeTab === 'qa' && (
				<>
					<div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
						<Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}&module=qa`}
							className="btn-primary text-xs px-4 py-1.5 gap-1.5 flex items-center">
							<Plus className="h-3.5 w-3.5" /> 提出问题
						</Link>
						<div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
							{[
								{ value: 'all', label: '全部' },
								{ value: 'unsolved', label: '待回答' },
								{ value: 'solved', label: '已解决' },
							].map((btn) => (
								<button key={btn.value}
									onClick={() => {/* 后续：状态筛选 */}}
									className={`text-xs px-3 py-1 rounded-md transition-colors ${
										btn.value === 'all'
											? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
											: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
									}`}>
									{btn.label}
								</button>
							))}
						</div>
					</div>
					<div className="flex items-center gap-2 mb-4 text-xs">
						<span className="text-gray-400">排序:</span>
						<select className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-primary-500">
							<option value="newest">最新提问</option>
							<option value="votes">最多投票</option>
							<option value="answers">最多回答</option>
							<option value="unanswered">尚未回答</option>
						</select>
					</div>

					{postLoading ? (
						<div className="space-y-3">
							{[...Array(3)].map((_, i) => (
								<div key={i} className="glass-card p-4 animate-pulse">
									<div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-3" />
									<div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
									<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-3" />
									<div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
								</div>
							))}
						</div>
					) : posts.filter(p => p.module_type === 'qa').length > 0 ? (
						<div className="space-y-2">
							{posts.filter(p => p.module_type === 'qa').map((post) => (
								<QACard
									key={post.id}
									post={{
										id: post.id, title: post.title, body: post.body, author: post.author,
										tags: post.tags, like_count: post.like_count, comment_count: post.comment_count,
										view_count: post.view_count, created_at: post.created_at,
										is_pinned: post.is_pinned,
									}}
									spaceNs={cleanNamespace}
									spaceName={space.title}
								/>
							))}
						</div>
					) : (
						<div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500 rounded-2xl">
							<HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
							<p className="text-base font-medium text-gray-500 dark:text-gray-400">暂无问答</p>
							<p className="text-sm mt-1">提出第一个问题，开启社区讨论</p>
							<Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}&module=qa`}
								className="btn-primary inline-flex items-center gap-1.5 mt-4 px-5 py-2 text-sm">
								<Plus className="h-4 w-4" /> 提出问题
							</Link>
						</div>
					)}
				</>
			)}

			{/* === Novel Tab === */}
			{activeTab === 'novel' && (
				<>
					<div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
						<Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}&module=novel`}
							className="btn-primary text-xs px-4 py-1.5 gap-1.5 flex items-center">
							<Plus className="h-3.5 w-3.5" /> 发布小说
						</Link>
						<div className="flex items-center gap-1.5">
							<button onClick={() => {/* 后续: 列表模式切换 */}}
								className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 transition-colors" title="书架视图">
								<Grid3X3 className="h-4 w-4" />
							</button>
							<button onClick={() => {/* 后续: 列表模式切换 */}}
								className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="列表视图">
								<List className="h-4 w-4" />
							</button>
						</div>
					</div>
					<div className="flex items-center gap-2 mb-4 text-xs">
						<span className="text-gray-400">排序:</span>
						<select className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-primary-500">
							<option value="updated">最近更新</option>
							<option value="views">最多阅读</option>
							<option value="likes">最多点赞</option>
							<option value="newest">最新发布</option>
						</select>
					</div>

					{postLoading ? (
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
							{[...Array(5)].map((_, i) => (
								<div key={i} className="glass-card rounded-2xl overflow-hidden animate-pulse">
									<div className="aspect-[3/4] bg-gray-200 dark:bg-gray-700" />
									<div className="p-3 space-y-2">
										<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
										<div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
									</div>
								</div>
							))}
						</div>
					) : posts.filter(p => p.module_type === 'novel').length > 0 ? (
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
							{posts.filter(p => p.module_type === 'novel').map((post) => (
								<NovelCard
									key={post.id}
									novel={adaptPostToNovel(post, cleanNamespace, space.title)}
								/>
							))}
						</div>
					) : (
						<div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500 rounded-2xl">
							<BookText className="h-12 w-12 mx-auto mb-3 opacity-30" />
							<p className="text-base font-medium text-gray-500 dark:text-gray-400">暂无小说内容</p>
							<p className="text-sm mt-1">发布你的第一篇作品，开启创作之旅</p>
							<Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}&module=novel`}
								className="btn-primary inline-flex items-center gap-1.5 mt-4 px-5 py-2 text-sm">
								<Plus className="h-4 w-4" /> 开始创作
							</Link>
						</div>
					)}
				</>
			)}

			{/* === Game Tab === */}
			{activeTab === 'game' && (
				<>
					<Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}&module=game`}
						className="glass-card flex items-center gap-3 hover:border-primary-400 dark:hover:border-primary-600 transition-colors group mb-4">
						<div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-medium text-sm group-hover:scale-105 transition-transform">
							<Gamepad2 className="h-5 w-5" />
						</div>
						<div className="flex-1">
							<p className="text-sm font-medium text-gray-900 dark:text-white">发布游戏内容</p>
							<p className="text-xs text-gray-400 dark:text-gray-500">支持 Markdown 语法，分享游戏攻略、评测、资讯</p>
						</div>
						<div className="btn-primary text-xs px-4 py-1.5 gap-1">
							<Plus className="h-3.5 w-3.5" /> 发布
						</div>
					</Link>

					{postLoading ? (
						<div className="glass-card py-8 text-center text-gray-400 animate-pulse">加载中...</div>
					) : posts.filter(p => p.module_type === 'game').length > 0 ? (
						<div className="space-y-3">
							{posts.filter(p => p.module_type === 'game').map((post) => (
								<GameCard key={post.id} post={{
									id: post.id, title: post.title, body: post.body, author: post.author,
									like_count: post.like_count, comment_count: post.comment_count,
									view_count: post.view_count, created_at: post.created_at,
									tags: post.tags, is_pinned: post.is_pinned,
								}} spaceNs={cleanNamespace} spaceName={space.title} />
							))}
						</div>
					) : (
						<div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500">
							<Gamepad2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
							<p>暂无游戏内容</p>
							<p className="text-sm mt-1">发布你的第一篇游戏攻略吧！</p>
						</div>
					)}
				</>
			)}

			{/* === MiniApp Tab === */}
			{activeTab === 'mini_app' && (
				<>
					<Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}&module=mini_app`}
						className="glass-card flex items-center gap-3 hover:border-primary-400 dark:hover:border-primary-600 transition-colors group mb-4">
						<div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-medium text-sm group-hover:scale-105 transition-transform">
							<AppWindow className="h-5 w-5" />
						</div>
						<div className="flex-1">
							<p className="text-sm font-medium text-gray-900 dark:text-white">发布小程序</p>
							<p className="text-xs text-gray-400 dark:text-gray-500">支持 Markdown 语法，发布小程序介绍与使用说明</p>
						</div>
						<div className="btn-primary text-xs px-4 py-1.5 gap-1">
							<Plus className="h-3.5 w-3.5" /> 发布
						</div>
					</Link>

					{postLoading ? (
						<div className="glass-card py-8 text-center text-gray-400 animate-pulse">加载中...</div>
					) : posts.filter(p => p.module_type === 'mini_app').length > 0 ? (
						<div className="space-y-3">
							{posts.filter(p => p.module_type === 'mini_app').map((post) => (
								<PostCard key={post.id} post={{
									id: post.id, title: post.title, body: post.body, author: post.author,
									space_id: post.space_id, space_ns: cleanNamespace, space_name: space.title,
									like_count: post.like_count, comment_count: post.comment_count, view_count: post.view_count,
									created_at: post.created_at, tags: post.tags, is_pinned: post.is_pinned,
									module_type: post.module_type,
								}} canHide={isOwner} onToggleHide={() => toggleHide(post.id)} isFeatured={post.is_featured} canFeature={isOwner && !post.is_hidden} onToggleFeature={() => toggleFeature(post.id, post.is_featured)} />
							))}
						</div>
					) : (
						<div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500">
							<AppWindow className="h-10 w-10 mx-auto mb-3 opacity-30" />
							<p>暂无小程序内容</p>
							<p className="text-sm mt-1">发布你的第一个小程序吧！</p>
						</div>
					)}
				</>
			)}

			{/* === Store Tab === */}
			{activeTab === 'store' && (
				<SpaceStore namespace={cleanNamespace} isOwner={isOwner} />
			)}

			{/* === Course Tab === */}
			{activeTab === 'course' && (
				<div className="glass-card py-10 text-center rounded-2xl">
					<div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center">
						<GraduationCap className="h-8 w-8 text-white" />
					</div>
					<p className="text-base font-semibold text-gray-700 dark:text-gray-300">课程模块</p>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">在线课程功能即将上线</p>
					<div className="mt-5 grid grid-cols-3 gap-2 max-w-xs mx-auto">
						{['视频课程', '图文教程', '互动测验'].map(f => (
							<span key={f} className="text-[11px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{f}</span>
						))}
					</div>
				</div>
			)}

			{/* === Dynamic Module Content (includes forum + custom modules) === */}
			{(() => {
				const KNOWN_TABS = new Set(['overview','wiki','share','polls','announcements','members','chat','video','code_repo','qa','novel','game','mini_app','store','course','analytics','series','membership']);
				const currentMod = spaceModules.find(m => m.module_key === activeTab);
				if (!currentMod || KNOWN_TABS.has(activeTab)) return null;
				const hasArticle = !currentMod.allowed_content_types || currentMod.allowed_content_types.includes('article');
				const hasVideo = !currentMod.allowed_content_types || currentMod.allowed_content_types.includes('video');
				const filteredPosts = posts.filter((p: any) => p.module_type === currentMod.module_key);
				return (
					<div>
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-2"><h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{currentMod.name}</h3>{hasArticle && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">文章</span>}{hasVideo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">视频</span>}</div>
							<Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}&module=${encodeURIComponent(currentMod.module_key)}`}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded-lg transition-colors">
								<Plus size={14} />发布
							</Link>
						</div>

						{/* Sort + show hidden */}
						<div className="flex items-center gap-2 mb-4 flex-wrap">
							<span className="text-xs text-gray-500 dark:text-gray-400">排序:</span>
							<select
								value={postSort}
								onChange={(e) => setPostSort(e.target.value)}
								className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-primary-500 focus:border-transparent"
							>
								<option value="newest">最新</option>
								<option value="views">最多浏览</option>
								<option value="likes">最多点赞</option>
							</select>
							{isOwner && (
								<label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer ml-2">
									<input
										type="checkbox"
										checked={showHiddenPosts}
										onChange={(e) => setShowHiddenPosts(e.target.checked)}
										className="h-3.5 w-3.5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
									/>
									显示已隐藏
								</label>
							)}
						</div>

						{/* Normal announcements */}
						{announcements.filter(a => a.importance === 'normal').length > 0 && (
							<div className="mb-4 space-y-2">
								<h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
									<Megaphone className="h-3 w-3" /> 公告
								</h4>
								{announcements.filter(a => a.importance === 'normal').map(ann => (
									<div key={ann.id} className="glass-card py-2.5 px-4">
										<p className="text-sm font-medium text-gray-900 dark:text-white">{ann.title}</p>
										<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ann.body}</p>
									</div>
								))}
							</div>
						)}

						{postLoading ? (
							<div className="glass-card py-8 text-center text-gray-400">加载中...</div>
						) : filteredPosts.length > 0 ? (
							<div className="space-y-2">
								{filteredPosts.map((p: any) => (
									<PostCard key={p.id} post={{
										id: p.id, title: p.title, body: p.body, author: p.author,
										space_id: p.space_id, space_ns: cleanNamespace, space_name: space?.title,
										like_count: p.like_count, comment_count: p.comment_count, view_count: p.view_count,
										created_at: p.created_at, tags: p.tags, is_pinned: p.is_pinned,
										is_hidden: p.is_hidden, module_type: p.module_type,
										module_label: currentMod.name,
									}} canPin={isOwner && !p.is_hidden} onTogglePin={() => togglePin(p.id, p.is_pinned)} canHide={isOwner} onToggleHide={() => toggleHide(p.id)} isFeatured={p.is_featured} canFeature={isOwner && !p.is_hidden} onToggleFeature={() => toggleFeature(p.id, p.is_featured)} canUnhide={isOwner && p.is_hidden} onToggleUnhide={() => toggleUnhide(p.id)} />
								))}
							</div>
						) : (
							<div className="glass-card py-8 text-center text-gray-400 dark:text-gray-500">
								<PenLine className="h-8 w-8 mx-auto mb-2 opacity-30" />
								<p className="text-sm">还没有内容</p>
								<Link href={`/creations/new?space=${encodeURIComponent(cleanNamespace)}&module=${encodeURIComponent(currentMod.module_key)}`}
									className="text-xs text-primary-600 dark:text-primary-400 hover:underline mt-1 inline-block">
									发布第一篇帖子
								</Link>
							</div>
						)}

						{/* Pagination */}
						{postTotalPages > 1 && (
							<div className="mt-4 flex items-center justify-center gap-2">
								<button onClick={() => goToPostPage(postPage - 1)} disabled={postPage <= 1}
									className="px-3 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
									← 上一页
								</button>
								{(() => {
									const pages: (number | string)[] = [];
									const maxShow = 7;
									const p = postPage;
									const t = postTotalPages;
									if (t <= maxShow) {
										for (let i = 1; i <= t; i++) pages.push(i);
									} else {
										pages.push(1);
										if (p > 3) pages.push('...');
										const start = Math.max(2, p - 1);
										const end = Math.min(t - 1, p + 1);
										for (let i = start; i <= end; i++) pages.push(i);
										if (p < t - 2) pages.push('...');
										pages.push(t);
									}
									return pages.map((pg, i) =>
										typeof pg === 'number' ? (
											<button key={i} onClick={() => goToPostPage(pg)}
												className={'w-9 h-9 rounded-full text-sm font-medium transition-colors ' +
													(pg === postPage ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800')}>
												{pg}
											</button>
										) : (
											<span key={i} className="px-1 text-gray-400 select-none">…</span>
										)
									);
								})()}
								<button onClick={() => goToPostPage(postPage + 1)} disabled={postPage >= postTotalPages}
									className="px-3 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
									下一页 →
								</button>
							</div>
						)}
						{postTotalPages > 0 && filteredPosts.length > 0 && (
							<div className="mt-2 pb-8 text-center text-xs text-gray-400">
								第 {postPage}/{postTotalPages} 页
							</div>
						)}
					</div>
				);
			})()}

			{/* === Analytics Tab === */}
			{activeTab === 'analytics' && isOwner && (
				<SpaceAnalytics namespace={cleanNamespace} spaceTitle={space?.title} />
			)}
		</>
	);
}
