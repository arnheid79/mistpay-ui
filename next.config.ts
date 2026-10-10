import type { NextConfig } from "next";

// NEXT_PUBLIC_*-prefixed vars are inlined automatically by Next.js at build
// time — no explicit `env` block needed. (A previous version of this file had
// one that coerced every unset var to `""` instead of leaving it `undefined`,
// which silently broke every `?? fallback` reading these vars elsewhere.)
const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL;
    if (!backendUrl) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl.replace(/\/$/, '')}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
