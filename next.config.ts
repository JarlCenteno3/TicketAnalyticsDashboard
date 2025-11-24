import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*turbopack: {},*/
  reactStrictMode: false,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@yaacovcr/transform": false,
    };
    return config;
  },
};

export default nextConfig;