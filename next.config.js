/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Don't use standalone output when integrating with Express
  // output: 'standalone',

  // Optimize memory usage
  experimental: {
    // Reduce memory usage during compilation
    workerThreads: false,
    cpus: 1,
  },

  // Turbopack configuration (required for Next.js 16+)
  turbopack: {},

  // Allow Next.js to work alongside Express
  async rewrites() {
    return [
      {
        source: '/static/:path*',
        destination: '/static/:path*',
      },
    ];
  },

  // Ensure images work correctly
  images: {
    unoptimized: true, // Disable image optimization when using external static serving
  },
};

module.exports = nextConfig;
