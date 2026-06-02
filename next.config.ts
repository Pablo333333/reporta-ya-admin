import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: '**' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/reports/:path*',
        destination: 'http://localhost:3000/reports/:path*',
      },
      {
        source: '/config/:path*',
        destination: 'http://localhost:3000/config/:path*',
      },
      {
        source: '/auth/:path*',
        destination: 'http://localhost:3000/auth/:path*',
      },
      {
        source: '/comunicados/:path*',
        destination: 'http://localhost:3000/comunicados/:path*',
      },
      {
        source: '/users/:path*',
        destination: 'http://localhost:3000/users/:path*',
      },
    ];
  },
};

export default nextConfig;
