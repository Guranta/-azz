import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@meme-affinity/core"],
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    root: path.join(__dirname, "../../"),
  },
};

export default nextConfig;
