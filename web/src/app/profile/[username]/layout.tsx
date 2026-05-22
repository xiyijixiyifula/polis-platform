import { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: '用户主页', template: '%s | Polis' },
  description: '查看用户个人资料和作品',
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
