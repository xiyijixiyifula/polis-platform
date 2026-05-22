import { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: '内容系列', template: '%s | Polis' },
  description: '探索系列内容，持续学习',
};

export default function SeriesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
