import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Internal, auth-gated dashboard: every page reads the session cookie and
  // live DB data, so component caching/prerendering buys nothing here.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
