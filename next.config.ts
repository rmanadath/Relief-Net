import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Production optimizations
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
