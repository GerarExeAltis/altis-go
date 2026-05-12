const isProd = process.env.NODE_ENV === 'production';
const repo = 'altis-bet';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isProd ? `/${repo}` : '',
  assetPrefix: isProd ? `/${repo}/` : '',
  reactStrictMode: true,
};

export default nextConfig;
