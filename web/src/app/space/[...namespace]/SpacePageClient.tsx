'use client';

import React from 'react';
import Link from 'next/link';
import { useSpaceData } from './hooks/useSpaceData';
import { useSpaceActions } from './hooks/useSpaceActions';
import SpaceHeader from './components/SpaceHeader';
import SpaceTabs from './components/SpaceTabs';
import SpaceActions from './components/SpaceActions';
import SpaceSidebar from './components/SpaceSidebar';
import AnnouncementsBanner from './components/AnnouncementsBanner';
import TabRenderer from './components/TabRenderer';

export default function SpacePage({ rawNamespace }: { rawNamespace: string | string[] }) {
	const data = useSpaceData(rawNamespace);
	const actions = useSpaceActions({
		cleanNamespace: data.cleanNamespace,
		isOwner: data.isOwner,
		isMember: data.isMember,
		isFollowing: data.isFollowing,
		isStarred: data.isStarred,
		joinStatus: data.joinStatus,
		posts: data.posts,
		space: data.space,
		postPage: data.postPage,
		postTotalPages: data.postTotalPages,
		postSort: data.postSort,
		showHiddenPosts: data.showHiddenPosts,
		loadingMore: data.loadingMore,
		setPosts: data.setPosts,
		setFeatured: data.setFeatured,
		setSpace: data.setSpace,
		setSeriesList: data.setSeriesList,
		setSpaceTiers: data.setSpaceTiers,
		setMySubscription: data.setMySubscription,
		setMembers: data.setMembers,
		setIsMember: data.setIsMember,
		setIsFollowing: data.setIsFollowing,
		setIsStarred: data.setIsStarred,
		setJoinStatus: data.setJoinStatus,
		setPostPage: data.setPostPage,
		setPostTotalPages: data.setPostTotalPages,
		setLoadingMore: data.setLoadingMore,
	});

	if (data.loading) {
		return <div className="mx-auto max-w-7xl px-4 py-12 text-center text-gray-400 dark:text-gray-500 animate-pulse">加载社区信息...</div>;
	}

	if (!data.space) {
		return (
			<div className="mx-auto max-w-7xl px-4 py-16 text-center">
				<div className="text-5xl mb-4">🔍</div>
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white">社区不存在</h2>
				<p className="mt-2 text-gray-500 dark:text-gray-400">未找到社区 &quot;{data.cleanNamespace}&quot;</p>
				<Link href="/explore" className="btn-primary mt-4 inline-block px-6 py-2">浏览其他社区</Link>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-7xl px-4 py-6">
			<SpaceHeader
				space={data.space}
				cleanNamespace={data.cleanNamespace}
				isOwner={data.isOwner}
				isMember={data.isMember}
				ownerName={data.ownerName}
				ownerSegment={data.ownerSegment}
				communityName={data.communityName}
				announcements={data.announcements}
				showEditDialog={actions.showEditDialog}
				setShowEditDialog={actions.setShowEditDialog}
				editForm={actions.editForm}
				setEditForm={actions.setEditForm}
				editSaving={actions.editSaving}
				uploadingIcon={actions.uploadingIcon}
				uploadingBanner={actions.uploadingBanner}
				onSaveEdit={actions.handleSaveSpaceEdit}
				onDeleteSpace={actions.handleDeleteSpace}
				onUploadIcon={actions.handleUploadIcon}
				onUploadBanner={actions.handleUploadBanner}
			/>

			<AnnouncementsBanner announcements={data.announcements} />

			<div className="relative">
				<SpaceTabs tabs={data.availableTabs} activeTab={data.activeTab} onTabChange={data.setActiveTab} />
				<div className="absolute right-0 top-0">
					<SpaceActions
						isOwner={data.isOwner}
						isMember={data.isMember}
						isFollowing={data.isFollowing}
						isStarred={data.isStarred}
						joinStatus={data.joinStatus}
						joining={actions.joining}
						followLoading={actions.followLoading}
						starLoading={actions.starLoading}
						showJoinInput={actions.showJoinInput}
						joinMessage={actions.joinMessage}
						setJoinMessage={actions.setJoinMessage}
						setShowJoinInput={actions.setShowJoinInput}
						onJoin={actions.handleJoinSpace}
						onFollow={actions.handleFollowSpace}
						onStar={actions.handleStarSpace}
						visibility={data.space.visibility}
					/>
				</div>
			</div>

			<div className="flex gap-6">
				<main className="flex-1 max-w-3xl">
					<TabRenderer
						space={data.space}
						cleanNamespace={data.cleanNamespace}
						posts={data.posts}
						announcements={data.announcements}
						polls={data.polls}
						overviewVideos={data.overviewVideos}
						featured={data.featured}
						seriesList={data.seriesList}
						members={data.members}
						spaceTiers={data.spaceTiers}
						mySubscription={data.mySubscription}
						spaceModules={data.spaceModules}
						moduleKeySet={data.moduleKeySet}
						activeTab={data.activeTab}
						isOwner={data.isOwner}
						isMember={data.isMember}
						postLoading={data.postLoading}
						seriesLoading={data.seriesLoading}
						membersLoading={data.membersLoading}
						tiersLoading={data.tiersLoading}
						loadingMore={data.loadingMore}
						postPage={data.postPage}
						postTotalPages={data.postTotalPages}
						postSort={data.postSort}
						showHiddenPosts={data.showHiddenPosts}
						setPostSort={data.setPostSort}
						setShowHiddenPosts={data.setShowHiddenPosts}
						togglePin={actions.togglePin}
						toggleHide={actions.toggleHide}
						toggleUnhide={actions.toggleUnhide}
						toggleFeature={actions.toggleFeature}
						loadMorePosts={actions.loadMorePosts}
						goToPostPage={actions.goToPostPage}
						showCreateSeries={actions.showCreateSeries}
						setShowCreateSeries={actions.setShowCreateSeries}
						newSeriesTitle={actions.newSeriesTitle}
						setNewSeriesTitle={actions.setNewSeriesTitle}
						newSeriesDesc={actions.newSeriesDesc}
						setNewSeriesDesc={actions.setNewSeriesDesc}
						seriesCreating={actions.seriesCreating}
						handleCreateSeries={actions.handleCreateSeries}
						showTierForm={actions.showTierForm}
						setShowTierForm={actions.setShowTierForm}
						editingTier={actions.editingTier}
						setEditingTier={actions.setEditingTier}
						tierForm={actions.tierForm}
						setTierForm={actions.setTierForm}
						tierSaving={actions.tierSaving}
						subscribing={actions.subscribing}
						handleSaveTier={actions.handleSaveTier}
						handleDeleteTier={actions.handleDeleteTier}
						handleSubscribe={actions.handleSubscribe}
						refreshMembers={actions.refreshMembers}
					/>
				</main>

				<SpaceSidebar
					space={data.space}
					displayNs={data.displayNs}
					ownerName={data.ownerName}
					availableTabs={data.availableTabs}
					isOwner={data.isOwner}
					cleanNamespace={data.cleanNamespace}
				/>
			</div>
		</div>
	);
}
