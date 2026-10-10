import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

export type LocalSupabase = {
  url: string;
  anonKey: string;
  serviceKey: string;
  dbUrl: string;
  mailpitUrl: string;
};

let cached: LocalSupabase | undefined;

/** Connection details for the local Supabase stack. Test-only: uses the service key. */
export function localSupabase(): LocalSupabase {
  if (cached) return cached;
  // Playwright's global setup resolves this once and shares it with workers via env.
  if (process.env.LOCAL_SUPABASE_JSON) {
    cached = JSON.parse(process.env.LOCAL_SUPABASE_JSON) as LocalSupabase;
    return cached;
  }
  let raw: string;
  try {
    raw = execFileSync("npx", ["supabase", "status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    throw new Error(
      "Local Supabase isn't running. Start it with `npm run db:start`.",
    );
  }
  const s = JSON.parse(raw) as Record<string, string>;
  cached = {
    url: s.API_URL,
    anonKey: s.PUBLISHABLE_KEY ?? s.ANON_KEY,
    serviceKey: s.SERVICE_ROLE_KEY ?? s.SECRET_KEY,
    dbUrl: s.DB_URL,
    mailpitUrl: s.MAILPIT_URL ?? s.INBUCKET_URL,
  };
  return cached;
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

export function adminClient(): SupabaseClient<Database> {
  const { url, serviceKey } = localSupabase();
  return createClient<Database>(url, serviceKey, noSession);
}

export type TestUser = {
  id: string;
  email: string;
  client: SupabaseClient<Database>;
};

/** Creates a confirmed user and returns a client signed in as them. */
export async function createTestUser(label: string): Promise<TestUser> {
  const { url, anonKey } = localSupabase();
  const email = `${label}-${randomUUID()}@test.local`;
  const password = randomUUID();
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const client = createClient<Database>(url, anonKey, noSession);
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;
  return { id: data.user.id, email, client };
}

/** Deletes a test user; owner_id cascades remove their rows. Storage objects are removed first. */
export async function deleteTestUser(user: TestUser): Promise<void> {
  const admin = adminClient();
  const { data: folders } = await admin.storage
    .from("attachments")
    .list(user.id);
  for (const folder of folders ?? []) {
    const { data: files } = await admin.storage
      .from("attachments")
      .list(`${user.id}/${folder.name}`);
    const paths = (files ?? []).map(
      (f) => `${user.id}/${folder.name}/${f.name}`,
    );
    if (paths.length) await admin.storage.from("attachments").remove(paths);
  }
  await admin.auth.admin.deleteUser(user.id);
}
