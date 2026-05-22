import { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: '视频播放', template: '%s | Polis' },
  description: '观看社区视频内容',
};

export default function VideoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
