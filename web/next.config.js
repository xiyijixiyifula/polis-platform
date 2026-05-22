/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const apiUrl = process.env.POLIS_API_URL || 'http://localhost:8080';
    return [
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
};

module.exports = nextConfig;
