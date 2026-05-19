'use client';

import ContentCard, { adaptFeedItem } from '@/components/ContentCard';

/** Feed 风格卡片（用于收藏/点赞列表） — 现在委托给统一的 ContentCard */
export function FeedItem({ item }: { item: any }) {
  const props = adaptFeedItem(item);
  return <ContentCard {...props} />;
}
