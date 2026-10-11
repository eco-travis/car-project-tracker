import { afterEach, describe, expect, it, vi } from "vitest";
import { devAutoLoginEnabled, safeNextPath } from "@/lib/dev-login";

const enabledEnv = {
  NODE_ENV: "development",
  DEV_AUTO_LOGIN: "1",
  DEV_LOGIN_PASSWORD: "local-secret",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
};

function withEnv(overrides: Partial<Record<keyof typeof enabledEnv, string>>) {
  for (const [k, v] of Object.entries({ ...enabledEnv, ...overrides }))
    vi.stubEnv(k, v);
}

afterEach(() => vi.unstubAllEnvs());

describe("devAutoLoginEnabled", () => {
  it("is on only when every guard holds", () => {
    withEnv({});
    expect(devAutoLoginEnabled()).toBe(true);
  });

  it.each([
    ["a production build", { NODE_ENV: "production" }],
    ["tests", { NODE_ENV: "test" }],
    ["the flag off", { DEV_AUTO_LOGIN: "0" }],
    ["no password", { DEV_LOGIN_PASSWORD: "" }],
    [
      "a hosted Supabase",
      { NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co" },
    ],
    [
      "a lookalike host",
      { NEXT_PUBLIC_SUPABASE_URL: "http://localhost.evil.io" },
    ],
  ])("is off with %s", (_label, overrides) => {
    withEnv(overrides);
    expect(devAutoLoginEnabled()).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps same-site paths and rejects everything else", () => {
    expect(safeNextPath("/jobs/1?x=2")).toBe("/jobs/1?x=2");
    expect(safeNextPath("//evil.io")).toBe("/");
    expect(safeNextPath("https://evil.io")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
  });
});
