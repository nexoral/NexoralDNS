/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4773/api/:path*',
      },
    ];
  },
};

export default nextConfig;
