import { Metadata } from 'next';
import LandingPage from '@/components/LandingPage';

export const metadata: Metadata = {
  title: '关于 Polis',
  description: 'Polis 是一个去中心化的个人社区创造与管理系统。让创建社区像创建 GitHub 仓库一样简单。',
  openGraph: {
    title: '关于 Polis - 未来社区平台',
    description: '让创建社区像创建 GitHub 仓库一样简单',
  },
};

export default function AboutPage() {
  return <LandingPage />;
}
