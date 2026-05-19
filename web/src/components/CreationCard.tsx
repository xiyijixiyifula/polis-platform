'use client';

import React, { useState } from 'react';
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
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSubmit?: (id: string) => void;
  onLike?: (id: string) => void;
  onBookmark?: (id: string) => void;
  onWithdraw?: (refId: string) => void;
}

export default function CreationCard({
  creation,
  isOwner = false,
  onEdit,
  onDelete,
  onSubmit,
  onLike,
  onBookmark,
  onWithdraw,
}: CreationCardProps) {
  const baseProps = adaptCreationItem(creation);

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <ContentCard
        {...baseProps}
        isOwner={isOwner}
        variant="feed"
        showOwnerActions={isOwner}
        showSubmissionsPanel={isOwner}
        onEdit={onEdit}
        onDelete={onDelete}
        onSubmit={onSubmit}
        onLike={onLike}
        onBookmark={onBookmark}
        onWithdraw={onWithdraw}
      />
    </div>
  );
}
