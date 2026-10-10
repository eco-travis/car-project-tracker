import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

// NEXT_PUBLIC_* must be referenced literally so Next can inline them in the browser bundle.
export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

/** Server-only settings. Call from server code; throws if misconfigured. */
export function serverEnv() {
  return z
    .object({ ALLOWED_EMAIL: z.email() })
    .parse({ ALLOWED_EMAIL: process.env.ALLOWED_EMAIL });
}
