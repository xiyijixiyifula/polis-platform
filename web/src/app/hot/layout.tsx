import { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: '热门内容', template: '%s | Polis' },
  description: '查看社区热门帖子和讨论',
};

export default function HotLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
