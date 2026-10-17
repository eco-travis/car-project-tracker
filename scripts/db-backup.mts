// Back up the LOCAL database (your data, every table) and its stored files to backups/<timestamp>/.
// Run: npm run db:backup   Restore: npm run db:restore -- backups/<timestamp>
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { adminClient } from "../tests/support/local-supabase.ts";
import { BUCKET, DB_CONTAINER, assertLocal, psql } from "./lib/local-db.mts";

assertLocal();
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dir = join("backups", stamp);
mkdirSync(join(dir, "files"), { recursive: true });

// Data only (the schema comes from the migrations). auth: users and identities, so owner ids match.
// Excludes bookkeeping tables the migrations recreate.
const dump = execFileSync(
  "docker",
  [
    "exec",
    DB_CONTAINER,
    "pg_dump",
    "-U",
    "supabase_admin",
    "-d",
    "postgres",
    "--data-only",
    "--disable-triggers",
    "--no-owner",
    "-n",
    "public",
    "-n",
    "auth",
    "-n",
    "storage",
    "--exclude-table=auth.schema_migrations",
    "--exclude-table=storage.migrations",
    "--exclude-table=storage.buckets",
    "--exclude-table-data=auth.sessions",
    "--exclude-table-data=auth.refresh_tokens",
    "--exclude-table-data=auth.flow_state",
    "--exclude-table-data=auth.one_time_tokens",
    "--exclude-table-data=auth.audit_log_entries",
    "--exclude-table-data=auth.mfa_amr_claims",
    // File rows are recreated by re-uploading the files on restore.
    "--exclude-table-data=storage.objects",
  ],
  { encoding: "utf8", maxBuffer: 1024 * 1024 * 1024 },
);
writeFileSync(join(dir, "data.sql"), dump);

// Only files belonging to existing users (test accounts are deleted; their files aren't backups).
const names = psql(
  `select o.name from storage.objects o where o.bucket_id = '${BUCKET}' ` +
    `and split_part(o.name, '/', 1) in (select id::text from auth.users) order by o.name`,
)
  .split("\n")
  .filter(Boolean);
const storage = adminClient().storage.from(BUCKET);
for (const name of names) {
  const { data, error } = await storage.download(name);
  if (error) throw new Error(`Couldn't download ${name}: ${error.message}`);
  const out = join(dir, "files", name);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, Buffer.from(await data.arrayBuffer()));
}
console.log(
  `Backed up the database and ${names.length} stored files to ${dir}`,
);
