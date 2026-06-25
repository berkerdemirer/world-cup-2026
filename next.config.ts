import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SQL migration files are read from disk at runtime by instrumentation.ts.
  outputFileTracingIncludes: {
    "/*": ["./db/migrations/**/*"],
  },
};

export default nextConfig;
