import { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: '趋势', template: '%s | Polis' },
  description: '查看社区趋势和热门话题',
};

export default function TrendingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
