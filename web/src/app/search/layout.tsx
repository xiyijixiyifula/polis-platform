import { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: '搜索', template: '%s | Polis' },
  description: '搜索社区、帖子和用户',
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
