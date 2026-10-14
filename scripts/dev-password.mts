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
// Create the user if this is a fresh database (no seed yet): onboarding starts from there.
let userId = user?.id;
if (!userId) {
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({ email, email_confirm: true });
  if (createError) throw createError;
  userId = created.user.id;
}
const { error } = await admin.auth.admin.updateUserById(userId, { password });
if (error) throw error;
console.log(`Dev password set for ${email}.`);
