/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Keep this
  images: {
    domains: ["zos.alipayobjects.com"], // Keep this if you load external images
  },
};

export default nextConfig;
