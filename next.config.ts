import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheMaxMemorySize: 50 * 1024 * 1024, // 50MB
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fantasy.premierleague.com",
        pathname: "/dist/img/shirts/**",
      },
    ],
  },
};

export default nextConfig;
