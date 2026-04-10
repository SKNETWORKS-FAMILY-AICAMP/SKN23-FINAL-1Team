import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ic.zigbang.com",
      },
    ],
  },
};

export default nextConfig;
