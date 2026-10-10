import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Default bottom-left overlaps the phone bottom nav.
  devIndicators: { position: "top-right" },
  // Cache Components is off: every screen reads the signed-in user's data per request,
  // and CSP nonces require dynamic rendering anyway. See DECISIONS.md (M1).
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
