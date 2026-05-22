import { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: '创作详情', template: '%s | Polis' },
  description: '查看创作者的创作作品',
};

export default function CreationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
