import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  assetPrefix: isGitHubPages ? '/newsgrid/' : '',
  images: { unoptimized: true },
};

export default nextConfig;
