import { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: '社区空间', template: '%s | Polis' },
  description: '探索去中心化社区，发现有趣内容',
};

export default function SpaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
