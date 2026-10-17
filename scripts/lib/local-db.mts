// Shared helpers for the local-database safety scripts (backup, restore, guard). Local only.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  adminClient,
  localSupabase,
} from "../../tests/support/local-supabase.ts";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export const DB_CONTAINER = "supabase_db_car-project-tracker";
export const BUCKET = "attachments";

export function assertLocal() {
  if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(localSupabase().url))
    throw new Error("Refusing: Supabase isn't local.");
}

export function psql(sql: string): string {
  return execFileSync(
    "docker",
    [
      "exec",
      DB_CONTAINER,
      "psql",
      "-U",
      "supabase_admin",
      "-d",
      "postgres",
      "-tAc",
      sql,
    ],
    {
      encoding: "utf8",
    },
  ).trim();
}

/** How much real data the owner (ALLOWED_EMAIL) has. Zero everywhere means nothing to lose. */
export async function ownerDataCounts(): Promise<Record<
  string,
  number
> | null> {
  const email = process.env.ALLOWED_EMAIL;
  if (!email) throw new Error("Set ALLOWED_EMAIL in .env.local first.");
  const admin = adminClient();
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const owner = data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!owner) return null;
  const counts: Record<string, number> = {};
  for (const t of [
    "vehicles",
    "jobs",
    "parts",
    "tools",
    "expenses",
    "attachments",
    "watch_items",
    "tasks",
    "inspirations",
  ] as const) {
    const { count, error } = await admin
      .from(t)
      .select("*", { count: "exact", head: true })
      .eq("owner_id", owner.id);
    if (error) throw error;
    counts[t] = count ?? 0;
  }
  return counts;
}

export function describeCounts(c: Record<string, number>): string {
  return Object.entries(c)
    .filter(([, n]) => n > 0)
    .map(([t, n]) => `${n} ${t.replace("_", " ")}`)
    .join(", ");
}
