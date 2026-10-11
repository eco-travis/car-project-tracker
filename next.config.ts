import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E uses its own build dir so tests can run while `npm run dev` is up on :3000.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Every corner collides with app chrome (bottom nav on phones, page actions top-right).
  // Compile and runtime errors still show in the dev overlay.
  devIndicators: false,
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
