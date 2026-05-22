'use client';

import React from 'react';
import ContentCard, {
  type ContentCardProps,
  type CreationPublic,
  type SubmissionInfo,
  adaptCreationItem,
} from '@/components/ContentCard';

// Re-export types for backward compatibility
export type { CreationPublic, SubmissionInfo };
export type { ContentCardCreator, SpaceMini } from '@/components/ContentCard';

interface CreationCardProps {
  creation: CreationPublic;
  showSource?: boolean;
  isOwner?: boolean;
  /** 仅展示投稿索引（社区/模块），不显示编辑/删除等管理按钮 */
  showSubmissionsOnly?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSubmit?: (id: string) => void;
  onLike?: (id: string) => void;
  onBookmark?: (id: string) => void;
  onWithdraw?: (refId: string) => void;
  onVisibilityChange?: (id: string, newVis: string) => void;
}

export default function CreationCard({
  creation,
  isOwner = false,
  showSubmissionsOnly = false,
  onEdit,
  onDelete,
  onSubmit,
  onLike,
  onBookmark,
  onWithdraw,
  onVisibilityChange,
}: CreationCardProps) {
  const baseProps = adaptCreationItem(creation);

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <ContentCard
        {...baseProps}
        isOwner={isOwner}
        variant="feed"
        showOwnerActions={isOwner && !showSubmissionsOnly}
        showSubmissionsPanel={isOwner || showSubmissionsOnly}
        onEdit={onEdit}
        onDelete={onDelete}
        onSubmit={onSubmit}
        onLike={onLike}
        onBookmark={onBookmark}
        onWithdraw={onWithdraw}
        onVisibilityChange={onVisibilityChange}
      />
    </div>
  );
}
