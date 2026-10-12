// Local demo data owned by ALLOWED_EMAIL. Run after `supabase db reset` (npm run db:reset does both).
// Uses the local service key via `supabase status`; never point this at production.
import { existsSync } from "node:fs";
import { seedDemo } from "../tests/support/demo-data.ts";
import { adminClient, localSupabase } from "../tests/support/local-supabase.ts";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const email = process.env.ALLOWED_EMAIL;
if (!email) throw new Error("Set ALLOWED_EMAIL in .env.local first.");
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(localSupabase().url))
  throw new Error("Refusing to seed a non-local Supabase.");

const admin = adminClient();
const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
let owner = list.users.find(
  (u) => u.email?.toLowerCase() === email.toLowerCase(),
);
if (!owner) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error) throw error;
  owner = data.user;
}
const s = await seedDemo(admin, owner.id);
console.log(
  `Seeded ${s.phases} phases, ${s.jobs} jobs, ${s.parts} parts, ${s.tools} tools, ${s.watch} watch items, ${s.tasks} tasks, and ${s.ideas} ideas for ${email}.`,
);
