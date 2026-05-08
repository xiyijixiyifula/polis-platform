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
      <body
        className="min-h-screen text-[rgb(var(--text-primary))] antialiased liquid-bg"
      >
        {/* === Liquid Glass SVG 滤镜系统（全局定义） === */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
          <defs>
            <filter id="liquid-glass" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
              <feTurbulence type="fractalNoise" baseFrequency="0.01 0.01" numOctaves="1" seed="5" result="turbulence">
                <animate attributeName="baseFrequency" dur="20s" values="0.01 0.01;0.012 0.008;0.01 0.01" repeatCount="indefinite" />
              </feTurbulence>
              <feComponentTransfer in="turbulence" result="mapped">
                <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
                <feFuncG type="gamma" amplitude="0.3" exponent="1" offset="0" />
                <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
              </feComponentTransfer>
              <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
              <feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lightingColor="white" result="specLight">
                <fePointLight x="-200" y="-200" z="300" />
              </feSpecularLighting>
              <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage" />
              <feDisplacementMap in="SourceGraphic" in2="softMap" scale="30" xChannelSelector="R" yChannelSelector="G" result="liquidDistortion" />
              <feBlend in="litImage" in2="liquidDistortion" mode="screen" result="final" />
            </filter>
            <filter id="frosted-glass" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" />
              <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>

        <Header />
        {children}
      </body>
    </html>
  );
}
