// Sets the local dev password for ALLOWED_EMAIL so DEV_AUTO_LOGIN can sign in. Local Supabase only.
import { existsSync } from "node:fs";
import { adminClient, localSupabase } from "../tests/support/local-supabase.ts";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const { ALLOWED_EMAIL: email, DEV_LOGIN_PASSWORD: password } = process.env;
if (!email || !password) {
  console.log(
    "Skipping dev password: set ALLOWED_EMAIL and DEV_LOGIN_PASSWORD in .env.local to use DEV_AUTO_LOGIN.",
  );
  process.exit(0);
}
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(localSupabase().url))
  throw new Error("Refusing to touch a non-local Supabase.");

const admin = adminClient();
const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
const user = data.users.find(
  (u) => u.email?.toLowerCase() === email.toLowerCase(),
);
if (!user) throw new Error(`No user ${email} yet. Run npm run db:seed first.`);
const { error } = await admin.auth.admin.updateUserById(user.id, { password });
if (error) throw error;
console.log(`Dev password set for ${email}.`);
