import type { NextConfig } from "next";

const s3Hostname = process.env.NEXT_IMAGE_S3_HOSTNAME;
const backendUrl = process.env.BACKEND_URL?.replace(/\/+$/, "");

const appImageHosts = [
  "3.37.97.17",
  "52.78.235.88",
  "127.0.0.1",
  "localhost",
  "geumbang.duckdns.org",
];

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "ic.zigbang.com",
  },
];

for (const hostname of appImageHosts) {
  remotePatterns.push(
    {
      protocol: "http",
      hostname,
      pathname: "/backend/api/images/**",
    },
    {
      protocol: "http",
      hostname,
      port: "8000",
      pathname: "/api/images/**",
    },
  );
}

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

  async rewrites() {
    if (!backendUrl) {
      return [];
    }

    return [
      {
        source: "/backend/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
