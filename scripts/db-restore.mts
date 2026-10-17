// Restore a backup made by `npm run db:backup` into the LOCAL database. Replaces everything.
// Run: npm run db:restore -- backups/<timestamp>
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { adminClient } from "../tests/support/local-supabase.ts";
import { BUCKET, DB_CONTAINER, assertLocal } from "./lib/local-db.mts";

const dir = process.argv[2];
if (!dir || !existsSync(join(dir, "data.sql")))
  throw new Error("Usage: npm run db:restore -- backups/<timestamp>");
assertLocal();

// Fresh schema from the migrations, then the saved rows, then the files.
execFileSync("npx", ["supabase", "db", "reset", "--local"], {
  stdio: "inherit",
});
execFileSync(
  "docker",
  [
    "exec",
    "-i",
    DB_CONTAINER,
    "psql",
    "-U",
    "supabase_admin",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-q",
  ],
  {
    input: readFileSync(join(dir, "data.sql")),
    stdio: ["pipe", "inherit", "inherit"],
  },
);

const files = join(dir, "files");
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) =>
    statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)],
  );
const storage = adminClient().storage.from(BUCKET);
let n = 0;
for (const path of existsSync(files) ? walk(files) : []) {
  const name = relative(files, path);
  const { error } = await storage.upload(name, readFileSync(path), {
    upsert: true,
  });
  if (error) throw new Error(`Couldn't restore ${name}: ${error.message}`);
  n++;
}
console.log(`Restored ${dir} (${n} files).`);
