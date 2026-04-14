import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://agent-api.belltherapeutics.net/api/:path*',
      },
    ]
  },
}

export default nextConfig
