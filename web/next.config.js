/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // 生产环境 API URL 通过环境变量配置
  // 在服务器上设置: POLIS_API_URL=https://your-domain.com
  async rewrites() {
    const apiUrl = process.env.POLIS_API_URL || 'http://localhost:8080';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
