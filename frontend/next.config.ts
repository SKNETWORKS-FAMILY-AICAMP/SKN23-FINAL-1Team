import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ic.zigbang.com",
      },
      {
        protocol: "https",
        hostname:
          "skn23-final-1team-355904321127-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
