import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.GITHUB_ACTIONS ? "/Hanami-High" : "",
  assetPrefix: process.env.GITHUB_ACTIONS ? "/Hanami-High/" : undefined,
  trailingSlash: true,
};

export default nextConfig;
