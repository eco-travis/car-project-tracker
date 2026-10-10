import type { FullConfig } from "@playwright/test";
import { localSupabase } from "../support/local-supabase";

/** Resolve local Supabase once for all workers, and compile routes before tests race the dev server. */
export default async function globalSetup(config: FullConfig) {
  process.env.LOCAL_SUPABASE_JSON = JSON.stringify(localSupabase());

  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) return;
  const routes = [
    "/login",
    "/onboarding",
    "/dashboard",
    "/plan",
    "/log",
    "/gallery",
    "/watch",
    "/tasks",
    "/parts",
    "/tools",
    "/inspiration",
    "/vehicle",
    "/auth/callback",
  ];
  await Promise.all(
    routes.map((r) =>
      fetch(new URL(r, baseURL), { redirect: "manual" }).catch(() => undefined),
    ),
  );
}
