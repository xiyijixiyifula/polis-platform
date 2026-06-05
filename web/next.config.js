/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compress: true,
  transpilePackages: ['cherry-markdown'],
  async redirects() {
    return [
      { source: '/create-center', destination: '/creations', permanent: true },
    ];
  },
  async rewrites() {
    const apiUrl = process.env.POLIS_API_URL || 'http://localhost:8080';
    const chainApiUrl = process.env.POLIS_CHAIN_API_URL || 'http://localhost:8545';
    return [
      {
        source: '/chain-api/:path*',
        destination: `${chainApiUrl}/api/v1/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.mzgw.com' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '*.githubusercontent.com' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: '*.alicdn.com' },
      { protocol: 'https', hostname: '*.aliyuncs.com' },
      { protocol: 'https', hostname: '*.qcloud.com' },
      { protocol: 'https', hostname: '*.myqcloud.com' },
    ],
    formats: ['image/webp', 'image/avif'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self';",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
