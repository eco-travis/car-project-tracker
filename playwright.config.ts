import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Tests read ALLOWED_EMAIL; the dev server reads the same file on its own.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const port = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "phone",
      // Chromium with mobile emulation: Playwright's WebKit build is unsupported on macOS 14.
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent: devices["iPhone 13"].userAgent,
      },
    },
  ],
  webServer: {
    // E2E_PREVIEW=1 runs against a production build (CSP nonces, no dev tooling).
    command: process.env.E2E_PREVIEW
      ? `npx next build && npx next start --port ${port}`
      : `npm run dev -- --port ${port}`,
    url: `http://localhost:${port}`,
    // Tests exercise the real sign-in gate; process env wins over .env.local.
    env: { DEV_AUTO_LOGIN: "0", NEXT_DIST_DIR: ".next-e2e" },
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
