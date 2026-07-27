import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@forgeone/types', '@forgeone/ui'],
};
export default nextConfig;
