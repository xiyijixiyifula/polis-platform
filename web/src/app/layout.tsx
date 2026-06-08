import 'cherry-markdown/dist/cherry-markdown.css';
import type { Metadata } from 'next';
import './globals.css';

import { Header } from '@/components/Header';
import { ClientLayoutWrapper } from '@/components/ClientLayoutWrapper';
import { IntlClientProvider } from '@/components/IntlClientProvider';
import { ToastProvider } from '@/components/ToastProvider';

export const metadata: Metadata = {
  title: { default: 'Polis - 未来社区平台', template: '%s | Polis' },
  description: 'Polis 是一个去中心化的个人社区创造与管理系统。让创建社区像创建 GitHub 仓库一样简单。',
  keywords: ['社区平台', '开源社区', 'Rust', '去中心化', 'Polis', '创建社区', '论坛', '知识社区'],
  authors: [{ name: 'Polis Team' }],
  metadataBase: new URL('https://www.mzgw.com'),
  alternates: { canonical: 'https://www.mzgw.com' },
  openGraph: {
    title: 'Polis - 未来社区平台',
    description: '让创建社区像创建 GitHub 仓库一样简单。创作、分享、发现，建立属于你的社区。',
    url: 'https://www.mzgw.com',
    siteName: 'Polis',
    type: 'website',
    locale: 'zh_CN',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Polis 社区平台' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Polis - 未来社区平台',
    description: '让创建社区像创建 GitHub 仓库一样简单',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {

  return (
    <html lang="zh" suppressHydrationWarning>
      <head>
        {/* 深色模式防闪烁：在页面渲染前从 localStorage 读取偏好并设置 dark class */}
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('polis_theme');if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})();`
        }} />
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
      <body className="min-h-screen antialiased bg-[#f5f5f7] dark:bg-[#000000] text-[#1d1d1f] dark:text-white">
        {/* === 背景装饰层：浮动模糊色块 === */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            overflow: 'hidden'
          }}
        >
          {/* 色块 1：淡蓝，左上角 */}
          <div style={{
            position: 'absolute',
            top: '-10%',
            left: '-5%',
            width: '50vw',
            height: '50vw',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,122,255,0.12) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'float-orb 12s ease-in-out infinite',
          }} />

          {/* 色块 2：淡紫，右侧中部 */}
          <div style={{
            position: 'absolute',
            top: '20%',
            right: '-10%',
            width: '45vw',
            height: '45vw',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(175,82,222,0.1) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'float-orb 15s ease-in-out 2s infinite',
          }} />

          {/* 色块 3：淡粉，左下 */}
          <div style={{
            position: 'absolute',
            bottom: '-10%',
            left: '10%',
            width: '40vw',
            height: '40vw',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,45,85,0.08) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'float-orb 18s ease-in-out 4s infinite',
          }} />

          {/* 色块 4：淡青，右下 */}
          <div style={{
            position: 'absolute',
            bottom: '5%',
            right: '5%',
            width: '35vw',
            height: '35vw',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(90,200,250,0.1) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'float-orb 14s ease-in-out 6s infinite',
          }} />

          {/* 噪点纹理叠加 */}
          <div style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.03,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px',
          }} />
        </div>

        {/* 主内容层 — z-index 提升到装饰层之上 */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <IntlClientProvider>
            <Header />
            <ClientLayoutWrapper>
              {children}
            </ClientLayoutWrapper>
          </IntlClientProvider>
        </div>
        <ToastProvider />
      </body>
    </html>
  );
}
