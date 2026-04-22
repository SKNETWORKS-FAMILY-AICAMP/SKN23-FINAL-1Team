import type { NextConfig } from "next";

const s3Hostname = process.env.NEXT_IMAGE_S3_HOSTNAME;

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "ic.zigbang.com",
  },
  {
    protocol: "http",
    hostname: "3.37.97.17",
    pathname: "/backend/api/images/**",
  },
  {
    protocol: "http",
    hostname: "3.37.97.17",
    port: "8000",
    pathname: "/api/images/**",
  },
  {
    protocol: "http",
    hostname: "geumbang.duckdns.org",
    pathname: "/backend/api/images/**",
  },
];

if (s3Hostname) {
  remotePatterns.push({
    protocol: "https",
    hostname: s3Hostname,
    pathname: "/zigbang_data/images/**",
  });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
