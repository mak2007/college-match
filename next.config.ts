import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': ['./dev.db'],
    '/**/*': ['./dev.db'],
  },
};

export default nextConfig;
