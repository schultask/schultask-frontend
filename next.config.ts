import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Pins the tracing root to this project — without it, Next.js searches
  // upward for the nearest lockfile and can pick up an unrelated one
  // elsewhere on the machine (e.g. a stray lockfile in the home directory).
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
