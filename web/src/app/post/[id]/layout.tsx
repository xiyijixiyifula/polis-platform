import { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: '帖子详情', template: '%s | Polis' },
  description: '查看精彩社区帖子，参与讨论互动',
};

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
