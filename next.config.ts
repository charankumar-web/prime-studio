import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Required to make Monaco Editor work in Vercel
  transpilePackages: ["@monaco-editor/react"],
};

export default nextConfig;
