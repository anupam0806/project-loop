/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Type checking is done independently via `tsc --noEmit` (npm run typecheck)
    // Next.js 14's internal type checker has a Node.js v24 compatibility issue
    ignoreBuildErrors: true,
  },
  eslint: {
    // Linting is done independently
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
