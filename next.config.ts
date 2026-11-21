import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow a second dev server (e.g. a preview session) to run against its own
  // build dir so it doesn't fight over .next/dev/lock with the primary server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
