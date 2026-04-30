import 'cherry-markdown/dist/cherry-markdown.css';
import type { Metadata } from 'next';
import './globals.css';

import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: { default: 'Polis - 未来社区平台', template: '%s | Polis' },
  description: 'Polis 是一个去中心化的个人社区创造与管理系统。让创建社区像创建 GitHub 仓库一样简单。支持论坛、视频、商城、代码仓库、WASM 插件。数据归你所有。',
  keywords: ['社区平台', '开源社区', 'Rust', '去中心化', 'Polis', '创建社区', '论坛', '知识社区'],
  authors: [{ name: 'Polis Team' }],
  openGraph: {
    title: 'Polis - 未来社区平台',
    description: '让创建社区像创建 GitHub 仓库一样简单',
    url: 'https://polis.app',
    siteName: 'Polis',
    type: 'website',
    locale: 'zh_CN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Polis - 未来社区平台',
    description: '让创建社区像创建 GitHub 仓库一样简单',
  },
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* SEO结构化数据 */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'Polis',
            description: '去中心化的个人社区创造与管理系统',
            applicationCategory: 'SocialNetworking',
            operatingSystem: 'Web',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
          })
        }} />
      </head>
      <body className="min-h-screen bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-primary))] antialiased">
        <Header />
        {children}
      </body>
    </html>
  );
}
