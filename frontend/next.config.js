/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable eslint during build to prevent build failures due to linting errors
  eslint: {
    // Only run ESLint on these directories during production builds
    dirs: ['app', 'components', 'lib', 'utils'],
    // Warning only, don't fail the build
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  // Configure image domains if needed
  images: {
    domains: [],
  },
  // Add any other Next.js config options here
};

module.exports = nextConfig;
