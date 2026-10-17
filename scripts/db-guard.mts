// Refuse to run a command that wipes local data (db:reset, db:fresh, db:seed) while the owner has
// real data, unless WIPE_MY_DATA=1. Even then, back up first.
import { execFileSync } from "node:child_process";
import {
  assertLocal,
  describeCounts,
  ownerDataCounts,
} from "./lib/local-db.mts";

assertLocal();
const counts = await ownerDataCounts();
const has = counts && Object.values(counts).some((n) => n > 0);
if (!has) process.exit(0);
if (process.env.WIPE_MY_DATA !== "1") {
  console.error(
    `\n  Stopped: this would erase your data (${describeCounts(counts!)}).\n` +
      `  To apply schema changes without losing anything: npm run db:migrate\n` +
      `  If you really mean to wipe it: WIPE_MY_DATA=1 npm run <command>  (a backup is taken first)\n`,
  );
  process.exit(1);
}
execFileSync(
  "node",
  ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "scripts/db-backup.mts"],
  { stdio: "inherit" },
);
