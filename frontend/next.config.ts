import type { NextConfig } from "next";

const s3Hostname = process.env.NEXT_IMAGE_S3_HOSTNAME;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ic.zigbang.com",
      },
      {
        protocol: "https",
        hostname: s3Hostname || "",
        pathname: "/zigbang_data/images/**",
      },
    ],
  },
};

export default nextConfig;
